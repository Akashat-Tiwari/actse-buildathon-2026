import threading
from typing import Dict, List, Optional

try:
    from backend.app.schemas.transaction import TransactionResponse
except ImportError:
    from app.schemas.transaction import TransactionResponse

class MemoryDB:
    """
    Thread-safe in-memory database store for transaction records and state tracking.
    """
    def __init__(self):
        self._lock = threading.Lock()
        self._transactions: Dict[str, TransactionResponse] = {}

    def save(self, transaction: TransactionResponse) -> TransactionResponse:
        with self._lock:
            self._transactions[transaction.transaction_id] = transaction
            return transaction

    def get(self, transaction_id: str) -> Optional[TransactionResponse]:
        with self._lock:
            return self._transactions.get(transaction_id)

    def list_all(self, limit: int = 100, offset: int = 0) -> List[TransactionResponse]:
        with self._lock:
            all_txs = list(self._transactions.values())
            all_txs.reverse()
            return all_txs[offset:offset + limit]

    def count(self) -> int:
        with self._lock:
            return len(self._transactions)

    def clear(self):
        with self._lock:
            self._transactions.clear()

db = MemoryDB()
