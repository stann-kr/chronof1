from contextlib import contextmanager
import fastf1
import pandas as pd

def fetch_event_meta(year: int):
    sched: pd.DataFrame = fastf1.get_event_schedule(year)

    events: list[dict] = []
    for _, row in sched.iterrows():
        # Skip testing sessions (pre‑season, in‑season)
        if str(row["EventFormat"]).lower() == "testing":
            continue

        rnd = int(row["RoundNumber"])
        event_id = year * 100 + rnd  # e.g. 202403

        events.append(
            dict(
                event_id=event_id,
                season_year=year,
                round=rnd,
                circuit=row["Location"],
                official_name=row["EventName"],
                event_date=row["EventDate"].date(),
            )
        )
    return events

def fetch_event_results(year: int, rnd: int):
    session = fastf1.get_session(year, rnd, "R")
    session.load()
    ress = session.results

    base_cols = {
        "DriverNumber", "Abbreviation", "TeamName",
        "Position", "GridPosition", "Points",
        "Status", "Laps", "FastestLapTime"
    }
    # 실제로 존재하는 열만 선택
    present_cols = list(base_cols.intersection(ress.columns))
    drv_df = ress[present_cols].copy()

    # 누락된 열이 있으면 기본값 추가 (선택)
    missing = base_cols.difference(ress.columns)
    for col in missing:
        drv_df[col] = None

    con_df = (
        drv_df.groupby("TeamName", dropna=False)
              .agg(points=("Points", "sum"), finish_pos=("Position", "min"))
              .reset_index()
    )
    return drv_df, con_df