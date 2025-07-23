from __future__ import annotations
import pandas as pd
from typing import Sequence, List

# ───────────────── 마스터 테이블 ─────────────────
def upsert_seasons(year: int):
    sql = """INSERT INTO history."Season"(season_year)
             VALUES (%s) ON CONFLICT (season_year) DO NOTHING"""
    return sql, [(year,)]

def upsert_circuits(names: List[str]):
    """Bulk‑UPSERT circuits by name only (other columns NULL)."""
    sql = '''INSERT INTO history."Circuit"(name)
             VALUES (%s)
             ON CONFLICT (name) DO NOTHING'''
    rows = [(n,) for n in names]
    return sql, rows

def upsert_constructors(names: List[str]):
    """Bulk‑UPSERT constructors (teams) by name only."""
    sql = '''INSERT INTO history."Constructor"(name)
             VALUES (%s)
             ON CONFLICT (name) DO NOTHING'''
    rows = [(n,) for n in names]
    return sql, rows


def upsert_drivers(abbrs: List[str]):
    """Bulk‑UPSERT drivers by 3‑letter abbreviation only.
    Since `forename`/`surname` are NOT NULL in the schema, we insert empty
    strings as placeholders when first creating the row.
    """
    sql = '''INSERT INTO history."Driver"(code, forename, surname)
             VALUES (%s, %s, %s)
             ON CONFLICT (code) DO NOTHING'''
    rows = [(a, "", "") for a in abbrs]
    return sql, rows

def upsert_events(event_dicts: Sequence[dict]):
    sql = """INSERT INTO history."Event"
               (event_id, season_year, circuit_id, round, official_name, event_date)
             VALUES (%(event_id)s,%(season_year)s,%(circuit_id)s,%(round)s,%(official_name)s,%(event_date)s)
             ON CONFLICT (event_id) DO UPDATE
               SET official_name = EXCLUDED.official_name"""
    return sql, event_dicts

# ───────────────── 경기 결과 ─────────────────
def upsert_driver_results(event_id: int,
                          df: pd.DataFrame,
                          driver_map: dict[str, int],
                          constructor_map: dict[str, int]):
    """Insert driver race results. Receives mapping dicts to resolve FKs."""
    sql = """INSERT INTO history."DriverEventResult"
               (event_id, driver_id, constructor_id, grid, finish_pos,
                points, laps, status, fastest_lap_time)
             VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
             ON CONFLICT (event_id, driver_id)
             DO UPDATE SET
                 points = EXCLUDED.points,
                 finish_pos = EXCLUDED.finish_pos"""
    rows = []
    for r in df.itertuples():
        rows.append(
            (
                event_id,
                driver_map[r.Abbreviation],
                constructor_map[r.TeamName],
                int(r.GridPosition),
                int(r.Position),
                float(r.Points),
                int(r.Laps),
                r.Status,
                str(r.FastestLapTime) if pd.notna(r.FastestLapTime) else None,
            )
        )
    return sql, rows