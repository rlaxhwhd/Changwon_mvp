"""Assertions shared by entity-level mock-to-API contract tests."""

from __future__ import annotations

from typing import Any


def assert_same_json_shape(expected: Any, actual: Any, path: str = "$") -> None:
    """Require exact object keys, nesting, and primitive types.

    For arrays, the first expected element is the item contract and every actual
    element must match it. Entity tests should pass the representative mock
    fragment selected in their work order.
    """

    if isinstance(expected, dict):
        assert isinstance(actual, dict), f"{path}: expected object, got {type(actual).__name__}"
        expected_keys = set(expected)
        actual_keys = set(actual)
        assert actual_keys == expected_keys, (
            f"{path}: key mismatch; missing={sorted(expected_keys - actual_keys)}, "
            f"extra={sorted(actual_keys - expected_keys)}"
        )
        for key, expected_value in expected.items():
            assert_same_json_shape(expected_value, actual[key], f"{path}.{key}")
        return

    if isinstance(expected, list):
        assert isinstance(actual, list), f"{path}: expected array, got {type(actual).__name__}"
        assert expected, f"{path}: expected array has no item contract"
        assert actual, f"{path}: API returned an empty array for a seeded contract fixture"

        def matches(expected_value: Any, actual_value: Any, item_path: str) -> bool:
            try:
                assert_same_json_shape(expected_value, actual_value, item_path)
            except AssertionError:
                return False
            return True

        for index, actual_value in enumerate(actual):
            assert any(matches(variant, actual_value, f"{path}[{index}]") for variant in expected), (
                f"{path}[{index}]: no mock contract variant matches the API item"
            )
        for index, expected_value in enumerate(expected):
            assert any(matches(expected_value, actual_value, f"{path}[{index}]") for actual_value in actual), (
                f"{path}: mock contract variant {index} is absent from the seeded API response"
            )
        return

    assert type(actual) is type(expected), (
        f"{path}: expected {type(expected).__name__}, got {type(actual).__name__}"
    )
