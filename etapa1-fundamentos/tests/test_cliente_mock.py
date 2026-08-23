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


@patch("src.cliente_mock.requests.get")
def test_listar_solicitudes_falla_con_404_como_servicio_mock_error(mock_get):
    """Verificar que errores 4xx (no-retryable) lanzan ServicioMockError, no HTTPError."""
    mock_get.return_value = _respuesta(404)
    with pytest.raises(ServicioMockError, match="HTTP 404"):
        listar_solicitudes()


@patch("src.cliente_mock.time.sleep", return_value=None)
@patch("src.cliente_mock.requests.get")
def test_listar_solicitudes_agota_reintentos_con_429_tiene_mensaje_claro(mock_get, _mock_sleep):
    """Verificar que el mensaje de error para 429 agotado no sea None."""
    mock_get.return_value = _respuesta(429, headers={"Retry-After": "1"})
    with pytest.raises(ServicioMockError) as exc_info:
        listar_solicitudes()
    error_msg = str(exc_info.value)
    assert "HTTP 429" in error_msg
    assert "None" not in error_msg


@patch("src.cliente_mock.time.sleep", return_value=None)
@patch("src.cliente_mock.requests.get", side_effect=requests.exceptions.ConnectionError("Connection refused"))
def test_listar_solicitudes_falla_con_mensaje_claro_si_servicio_caido(mock_get, _mock_sleep):
    with pytest.raises(ServicioMockError, match="no respondió correctamente"):
        listar_solicitudes()
