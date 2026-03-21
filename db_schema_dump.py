import psycopg2
import json
from datetime import date, datetime
from decimal import Decimal

# Replace with your Neon connection string
DATABASE_URL = "postgresql://neondb_owner:npg_Yq86weIBZNKs@ep-super-sound-a8x20mud-pooler.eastus2.azure.neon.tech/neondb?sslmode=require&channel_binding=require"

def default_serializer(obj):
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, memoryview):
        return obj.tobytes().hex()
    if isinstance(obj, bytes):
        return obj.hex()
    return str(obj)

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # 1. Get all user-created tables
    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)
    tables = [row[0] for row in cur.fetchall()]

    result = {}

    for table in tables:
        # 2. Get columns with types, nullable, defaults
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default,
                   character_maximum_length, numeric_precision
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position;
        """, (table,))
        columns = []
        for col in cur.fetchall():
            columns.append({
                "name": col[0],
                "type": col[1],
                "nullable": col[2],
                "default": col[3],
                "max_length": col[4],
                "numeric_precision": col[5],
            })

        # 3. Get primary keys
        cur.execute("""
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_schema = 'public' AND tc.table_name = %s
              AND tc.constraint_type = 'PRIMARY KEY'
            ORDER BY kcu.ordinal_position;
        """, (table,))
        primary_keys = [row[0] for row in cur.fetchall()]

        # 4. Get foreign keys
        cur.execute("""
            SELECT kcu.column_name, ccu.table_name AS ref_table, ccu.column_name AS ref_column
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
              ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_schema = 'public' AND tc.table_name = %s
              AND tc.constraint_type = 'FOREIGN KEY';
        """, (table,))
        foreign_keys = []
        for fk in cur.fetchall():
            foreign_keys.append({
                "column": fk[0],
                "references_table": fk[1],
                "references_column": fk[2],
            })

        # 5. Get unique constraints
        cur.execute("""
            SELECT tc.constraint_name, kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_schema = 'public' AND tc.table_name = %s
              AND tc.constraint_type = 'UNIQUE'
            ORDER BY tc.constraint_name, kcu.ordinal_position;
        """, (table,))
        unique_raw = cur.fetchall()
        unique_constraints = {}
        for name, col in unique_raw:
            unique_constraints.setdefault(name, []).append(col)
        unique_list = list(unique_constraints.values())

        # 6. Get check constraints
        cur.execute("""
            SELECT cc.check_clause
            FROM information_schema.table_constraints tc
            JOIN information_schema.check_constraints cc
              ON tc.constraint_name = cc.constraint_name
            WHERE tc.table_schema = 'public' AND tc.table_name = %s
              AND tc.constraint_type = 'CHECK';
        """, (table,))
        check_constraints = [row[0] for row in cur.fetchall()]

        # 7. Get indexes
        cur.execute("""
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE schemaname = 'public' AND tablename = %s;
        """, (table,))
        indexes = [{"name": row[0], "definition": row[1]} for row in cur.fetchall()]

        # 8. Get 1 sample row
        cur.execute(f'SELECT * FROM "{table}" LIMIT 1;')
        sample_row = None
        if cur.description:
            col_names = [desc[0] for desc in cur.description]
            row = cur.fetchone()
            if row:
                sample_row = dict(zip(col_names, row))

        result[table] = {
            "columns": columns,
            "primary_keys": primary_keys,
            "foreign_keys": foreign_keys,
            "unique_constraints": unique_list,
            "check_constraints": check_constraints,
            "indexes": indexes,
            "sample_row": sample_row,
        }

    cur.close()
    conn.close()

    output = json.dumps(result, indent=2, default=default_serializer)
    print(output)

    with open("db_schema_dump.json", "w", encoding="utf-8") as f:
        f.write(output)

    print("\n✅ Schema saved to db_schema_dump.json")

if __name__ == "__main__":
    main()