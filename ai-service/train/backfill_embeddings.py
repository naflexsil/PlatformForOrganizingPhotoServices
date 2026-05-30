import os
import time
import requests
import psycopg2
from tqdm import tqdm

AI_URL = os.getenv("AI_SERVICE_URL",  "http://localhost:8001")
DB_URL = os.getenv(
    "DATABASE_URL",    "postgresql://postgres:MoeL1obimoe96ivotnoe-Din0@localhost:5433/photoservices_db")
BASE_URL = os.getenv("BACKEND_URL",    "http://localhost:3000")


def main():
    # 1. Проверяем AI-сервис
    r = requests.get(f"{AI_URL}/health", timeout=5)
    assert r.json()["status"] == "ok", "AI-сервис недоступен"
    print(f"AI-сервис: {AI_URL} ✓")

    # 2. Берём фото без эмбеддингов
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    cur.execute("""
        SELECT id, "urlPreview" FROM photos
        WHERE "embeddingVector" = '{}'::DOUBLE PRECISION[]
           OR "embeddingVector" IS NULL
        ORDER BY "createdAt" DESC
    """)
    photos = cur.fetchall()
    print(f"Фото без эмбеддинга: {len(photos)}")

    ok = fail = 0
    for photo_id, preview_url in tqdm(photos, desc="Генерация эмбеддингов"):
        try:
            full_url = preview_url if preview_url.startswith(
                "http") else f"{BASE_URL}{preview_url}"
            r = requests.post(f"{AI_URL}/embed",
                              json={"url": full_url}, timeout=30)
            r.raise_for_status()
            embedding = r.json()["embedding"]

            cur.execute(
                'UPDATE photos SET "embeddingVector" = %s WHERE id = %s',
                (embedding, photo_id),
            )
            conn.commit()
            ok += 1
            time.sleep(0.05)
        except Exception as e:
            fail += 1
            print(f"\n  Ошибка {photo_id}: {e}")

    cur.close()
    conn.close()
    print(f"\nГотово: {ok} успешно, {fail} ошибок")


if __name__ == "__main__":
    main()
