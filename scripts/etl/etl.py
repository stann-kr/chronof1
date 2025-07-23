"""FastF1 → PostgreSQL ETL runner for chronoF1.

Usage:
    python etl.py 2024          # 한 시즌
    python etl.py 2022-2024     # 여러 시즌 범위
"""

import argparse
import logging
from dotenv import load_dotenv
from adapters.fastf1_io import fetch_event_meta, fetch_event_results
from adapters.db_io import PgPool
from adapters import mappers
from typing import Dict

# --------------------------------------------------------------------------- #
# 환경 변수 (.env) 로드
# --------------------------------------------------------------------------- #
load_dotenv()

# --------------------------------------------------------------------------- #
# 로깅 설정
# --------------------------------------------------------------------------- #
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
)
log = logging.getLogger("chrono_f1.etl")


# --------------------------------------------------------------------------- #
# 시즌 단위 ETL
# --------------------------------------------------------------------------- #
def etl_season(pool: PgPool, year: int) -> None:
    """한 시즌의 그랑프리 메타·결과를 history 스키마에 적재"""
    log.info("===== [%s 시즌] =====", year)

    # 1) 이벤트(라운드) 메타 --------------------------------------------------- #
    events = fetch_event_meta(year)

    # ---- Circuit lookup / insert ----
    circuit_names = {ev["circuit"] for ev in events}

    with pool.tx() as cur:
        # 1) 이미 존재하는 회로 조회
        cur.execute(
            'SELECT circuit_id, name FROM history."Circuit" WHERE name = ANY(%s)',
            (list(circuit_names),),
        )
        circuit_map: Dict[str, int] = {row[1]: row[0] for row in cur.fetchall()}

        # 2) 없는 회로만 삽입
        missing = [name for name in circuit_names if name not in circuit_map]
        if missing:
            cur.executemany(
                'INSERT INTO history."Circuit"(name) VALUES (%s)',
                [(n,) for n in missing],
            )
            # 새로 삽입된 ID 다시 조회
            cur.execute(
                'SELECT circuit_id, name FROM history."Circuit" WHERE name = ANY(%s)',
                (missing,),
            )
            circuit_map.update({row[1]: row[0] for row in cur.fetchall()})

    # attach FK to each event dict
    for ev in events:
        ev["circuit_id"] = circuit_map[ev["circuit"]]

    with pool.tx() as cur:
        cur.executemany(*mappers.upsert_seasons(year))
        cur.executemany(*mappers.upsert_events(events))
    log.info("  ▸ 이벤트 메타 %d건 저장", len(events))

    # 2) 각 라운드 결과 ------------------------------------------------------- #
    for ev in events:
        log.info("  ⏳ Rd.%02d %s", ev["round"], ev["official_name"])
        drv_df, _ = fetch_event_results(year, ev["round"])

        # ------------------------------------------------------------------ #
        # Constructor (team) cache
        team_names = drv_df["TeamName"].unique().tolist()
        with pool.tx() as cur:
            cur.executemany(*mappers.upsert_constructors(team_names))
            cur.execute(
                'SELECT constructor_id, name FROM history."Constructor" WHERE name = ANY(%s)',
                (team_names,),
            )
            constructor_map: Dict[str, int] = {row[1]: row[0] for row in cur.fetchall()}

        # Driver cache
        abbrs = drv_df["Abbreviation"].unique().tolist()
        with pool.tx() as cur:
            cur.executemany(*mappers.upsert_drivers(abbrs))
            cur.execute(
                'SELECT driver_id, code FROM history."Driver" WHERE code = ANY(%s)',
                (abbrs,),
            )
            driver_map: Dict[str, int] = {row[1]: row[0] for row in cur.fetchall()}

        # ------------------------------------------------------------------ #
        with pool.tx() as cur:
            cur.executemany(
                *mappers.upsert_driver_results(ev["event_id"], drv_df, driver_map, constructor_map)
            )

        log.info("  ✅ 저장 완료 (drivers: %d)", len(drv_df))


# --------------------------------------------------------------------------- #
# 메인 진입점
# --------------------------------------------------------------------------- #
def main() -> None:
    parser = argparse.ArgumentParser("FastF1 → PostgreSQL ETL")
    parser.add_argument("season", help="2024 또는 2022-2024 범위")
    args = parser.parse_args()

    # 시즌 범위 파싱
    if "-" in args.season:
        start, end = map(int, args.season.split("-"))
        years = range(start, end + 1)
    else:
        years = [int(args.season)]

    pool = PgPool()
    try:
        for yr in years:
            etl_season(pool, yr)
    finally:
        pool.close()
        log.info("🎉 모든 시즌 처리 완료")


if __name__ == "__main__":
    main()