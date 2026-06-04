import argparse
import os
import time

import psycopg2
import requests
from tqdm import tqdm

AI_URL   = os.getenv("AI_SERVICE_URL", "http://localhost:8001")
DB_URL   = os.getenv("DATABASE_URL",   "postgresql://postgres:MoeL1obimoe96ivotnoe-Din0@localhost:5433/photoservices_db")
BASE_URL = os.getenv("BACKEND_URL",    "http://localhost:3000")


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--db-url",      default=DB_URL)
    p.add_argument("--backend-url", default=BASE_URL)
    p.add_argument("--ai-url",      default=AI_URL)
    return p.parse_args()


def main():
    args = parse_args()

    r = requests.get(f"{args.ai_url}/health", timeout=5)
    assert r.json()["status"] == "ok", "AI-сервис недоступен"
    print(f"AI-сервис: {args.ai_url} ✓")

    conn = psycopg2.connect(args.db_url)
    cur  = conn.cursor()

    cur.execute("""
        SELECT id, "urlPreview" FROM photos
        WHERE "userId" IS NOT NULL
          AND id NOT IN (SELECT "A" FROM "_PhotoToPost")
          AND ("embeddingVector" IS NULL OR "category" IS NULL OR "colorTone" IS NULL)
        ORDER BY "createdAt" DESC
    """)
    photos = cur.fetchall()
    print(f"Фото требующих обработки: {len(photos)}")

    if not photos:
        print("Все фото уже обработаны.")
        cur.close()
        conn.close()
        return

    ok = fail = 0
    for photo_id, preview_url in tqdm(photos, desc="Анализ фото"):
        try:
            full_url = (
                preview_url if preview_url.startswith("http")
                else f"{args.backend_url}{preview_url}"
            )
            r = requests.post(f"{args.ai_url}/analyze-url", json={"url": full_url}, timeout=30)
            r.raise_for_status()
            data = r.json()

            embedding  = data.get("embedding")
            category   = data.get("category")
            color_tone = data.get("colorTone")

            if embedding:
                vector_str = f"[{','.join(str(v) for v in embedding)}]"
                cur.execute(
                    """UPDATE photos
                       SET "embeddingVector" = %s::vector,
                           "category"        = %s,
                           "colorTone"       = %s
                       WHERE id = %s""",
                    (vector_str, category, color_tone, photo_id),
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
