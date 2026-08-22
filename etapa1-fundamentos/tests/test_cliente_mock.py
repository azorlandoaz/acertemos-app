from unittest.mock import Mock, patch

import pytest
import requests

from src.cliente_mock import ServicioMockError, crear_solicitud, listar_solicitudes


def _respuesta(status_code, json_data=None, headers=None):
    resp = Mock(spec=requests.Response)
    resp.status_code = status_code
    resp.headers = headers or {}
    resp.json.return_value = json_data if json_data is not None else {}
    resp.text = str(json_data)
    resp.raise_for_status = Mock()
    if status_code >= 400:
        resp.raise_for_status.side_effect = requests.exceptions.HTTPError(str(status_code))
    return resp


@patch("src.cliente_mock.requests.get")
def test_listar_solicitudes_devuelve_lista(mock_get):
    mock_get.return_value = _respuesta(200, json_data=[{"id": "EXT-1"}])
    resultado = listar_solicitudes(area="Compras")
    assert resultado == [{"id": "EXT-1"}]
    mock_get.assert_called_once()


@patch("src.cliente_mock.time.sleep", return_value=None)
@patch("src.cliente_mock.requests.get")
def test_listar_solicitudes_reintenta_ante_429(mock_get, _mock_sleep):
    mock_get.side_effect = [
        _respuesta(429, headers={"Retry-After": "1"}),
        _respuesta(200, json_data=[]),
    ]
    resultado = listar_solicitudes()
    assert resultado == []
    assert mock_get.call_count == 2


@patch("src.cliente_mock.time.sleep", return_value=None)
@patch("src.cliente_mock.requests.get")
def test_listar_solicitudes_falla_con_mensaje_claro_tras_agotar_reintentos(mock_get, _mock_sleep):
    mock_get.return_value = _respuesta(500)
    with pytest.raises(ServicioMockError, match="no respondió correctamente"):
        listar_solicitudes()


@patch("src.cliente_mock.time.sleep", return_value=None)
@patch("src.cliente_mock.requests.post")
def test_crear_solicitud_envia_idempotency_key(mock_post, _mock_sleep):
    mock_post.return_value = _respuesta(201, json_data={"id": "EXT-2"})
    resultado = crear_solicitud({"asunto": "x"}, clave_idempotencia="clave-1")
    assert resultado == {"id": "EXT-2"}
    _, kwargs = mock_post.call_args
    assert kwargs["headers"]["Idempotency-Key"] == "clave-1"
