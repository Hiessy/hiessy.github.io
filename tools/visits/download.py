"""Download to `.work/visits/` the days of visits that aren't there yet.

Starts the day after the latest file and stops at yesterday: today waits for
tomorrow because it isn't over. If the PC was off for a week, the next run
catches up on its own.

    python tools/visits/download.py
"""
import datetime, json, pathlib, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
TARGET = ROOT / ".work" / "visits"
ENV = pathlib.Path.home() / ".cloudflare.env"
FIRST_DAY = datetime.date(2026, 10, 30)
ARGENTINA = datetime.timezone(datetime.timedelta(hours=-3))


def read_env():
    rows = (l.split("=", 1) for l in ENV.read_text(encoding="utf-8-sig").splitlines() if "=" in l)
    return {k.strip(): v.strip().strip("\"'") for k, v in rows}


def fetch(url, token):
    r = urllib.request.Request(url, headers={
        "Authorization": "Bearer " + token, "User-Agent": "hiessy-visits"})
    return json.load(urllib.request.urlopen(r, timeout=60))


def main():
    env = read_env()
    TARGET.mkdir(parents=True, exist_ok=True)
    done = sorted(p.stem for p in TARGET.glob("*.json"))
    day = datetime.date.fromisoformat(done[-1]) + datetime.timedelta(days=1) if done else FIRST_DAY
    today = datetime.datetime.now(ARGENTINA).date()
    while day < today:
        data = fetch(f"{env['VISITS_URL']}/day/{day}", env["VISITS_TOKEN"])
        (TARGET / f"{day}.json").write_text(
            json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        print(day, data["visits"], "visits,", data["visitors"], "visitors")
        day += datetime.timedelta(days=1)


if __name__ == "__main__":
    main()
