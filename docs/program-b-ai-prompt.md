# AI prompt — design Program B (CrossFit / longevity)

Copy everything below the line into ChatGPT, Claude, or similar. Paste the program it returns back into dpwork to seed your account.

---

You are a strength & conditioning coach. Design **Program B** for a 3-week training cycle:

- **Weeks 1–2:** Program A (hypertrophy / bodybuilding split — already set).
- **Week 3:** Program B (this program) — **CrossFit-inspired + longevity** (not bodybuilding isolation focus).

## Athlete profile

- Trains 4–6 days per week on Program B week.
- Wants: strength, work capacity, joint health, Zone 2 base, simple metcons, carries, hangs, recovery.
- Avoid: excessive single-joint bodybuilding volume, training to failure every session.
- Equipment: full gym (barbell, rack, KBs, rower, sled optional, pull-up bar, pool access some weeks).

## Output format (strict)

Return **only** this structure so it can be pasted into a database seed:

```
PROGRAM B

Monday — [Workout name]
- Exercise Name — sets/reps or time (focus: Strength|Engine|Metcon|Mobility|Longevity|Recovery|Cardio)
(repeat per exercise)

Tuesday — ...
...
Sunday — ...
```

Use these **day labels exactly**: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.

For **cardio-only** days use one line, e.g. `Run — 4–8 km (focus: Cardio)`.

For **metcons** use one row with notes, e.g. `AMRAP — 15 min (focus: Metcon) · notes: 5 pull-ups, 10 push-ups, 15 squats`.

Include **7 days** (rest day = light recovery session, not empty).

## Style reference (Program A — do NOT copy, only contrast)

Program A is hypertrophy: Push / Pull / runs / Legs / Shoulders / long run / swim.

Program B should feel different: more **full-body**, **time caps**, **carries**, **Zone 2**, **AMRAPs**, **mobility**, **longevity finisher**.

## Deliverable

One complete Program B week. Keep exercise count **3–6 per lifting day**, **1–2 on cardio/recovery days**. Be specific with sets, reps, distances, or time domains.
