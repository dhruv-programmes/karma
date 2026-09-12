"""Deterministic, keyless document integrity checks."""

import hashlib

from app.services.core import inspect_document_integrity


def test_valid_pdf_signature_and_hash_passes():
    payload = b"%PDF-1.7\n1 0 obj\n(receipt)\nendobj\n%%EOF"
    result = inspect_document_integrity(
        filename="receipt.pdf",
        mime_type="application/pdf",
        size_bytes=len(payload),
        content=payload,
        metadata={"sha256": hashlib.sha256(payload).hexdigest()},
    )
    assert result["fraud_detected"] is False
    assert result["verification_status"] == "passed"


def test_invalid_pdf_and_mime_mismatch_are_rejected():
    result = inspect_document_integrity(
        filename="receipt.pdf",
        mime_type="application/pdf",
        size_bytes=12,
        content=b"not a pdf",
    )
    assert result["fraud_detected"] is True
    assert "invalid_pdf_signature" in result["fraud_reasons"]

    mismatch = inspect_document_integrity(
        filename="receipt.exe.pdf",
        mime_type="application/pdf",
        size_bytes=100,
    )
    assert mismatch["fraud_detected"] is True
    assert "disguised_executable_filename" in mismatch["fraud_reasons"]


def test_valid_and_malformed_csv_are_distinguished():
    valid = inspect_document_integrity(
        filename="transactions.csv",
        mime_type="text/csv",
        content="merchant,amount\nCroma,899\n",
    )
    assert valid["fraud_detected"] is False

    malformed = inspect_document_integrity(
        filename="transactions.csv",
        mime_type="text/csv",
        content="only one column\n",
    )
    assert malformed["fraud_detected"] is True
    assert "malformed_csv" in malformed["fraud_reasons"]


def test_forged_markers_duplicate_ids_and_bad_amounts_block_rewards():
    result = inspect_document_integrity(
        text="FAKE RECEIPT\nCroma 899.00",
        items=[
            {"id": "line-1", "merchant": "Croma", "amount_inr": 899},
            {"id": "line-1", "merchant": "Croma", "amount_inr": 899},
        ],
    )
    assert result["fraud_detected"] is True
    assert "forged_document_marker" in result["fraud_reasons"]
    assert "duplicate_item_id" in result["fraud_reasons"]

    invalid_amount = inspect_document_integrity(
        items=[{"id": "line-2", "merchant": "Croma", "amount_inr": -1}]
    )
    assert invalid_amount["fraud_detected"] is True
    assert "invalid_item_amount" in invalid_amount["fraud_reasons"]

