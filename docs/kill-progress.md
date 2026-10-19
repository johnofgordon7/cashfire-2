# Film kill and return progress

The original Cashfire `call-of-booty/src/game.js` defines both the event timestamps and the running ladder. Its SHA-256 is `af55212552676fec2f50f8dd3f5946fa8f9525e11696aed68e1b92094c3c1f8a`. The original `CashfireMeter.jsx` SHA-256 is `93f16be0d0a182fe9f7fd75670f4d79e6b53445bcb986092523851a443024544`. Source copies were read only. Representative native frames confirm that annotations track takedowns; the source timestamps are not retuned to first-impact frames. The films have no burned-in numeric kill or paytable HUD.

| Mode | Confirmed kill timestamps (seconds) | Pre-extraction tiers | Final reveal |
| --- | --- | --- | --- |
| Normal | 6.5, 12.3, 18.3, 24.1 | 0, 0.5×, 1×, 2×, 2× held | 5× |
| Mega | 3.95, 5.15, 8.45, 9.55, 14, 16.05, 18.7, 19.45, 23.45, 24.65 | 0, 0.5×, 1×, 2×, 5×, 10×, 25×, 50×, 100×, 250×, 250× held | 1,000× |

The source ladder is `[0, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 1000]`. This adaptation deliberately holds the previous tier on the terminal kill until the 30-second endpoint or explicit Skip/recovery Continue. It preserves the existing final-result reveal direction without inventing payout weights. All supported stakes are multiples of ten pence, so the half-stake step is exact. The defensive arbitrary-pence path floors a fractional penny; the final accepted return remains exact.

The HUD labels running return, or example return in a free preview, and states that the prerecorded result was set before play. No targeting controls, skill influence, additional RNG, next monetary target or full future ladder is introduced. These visual increments illustrate the selected result; they do not accumulate wallet credits. The fixed accepted result is still 5× for three boxes and 1,000× for four.

Progress reads the native video clock. Confirmed kills are monotonic within an attempt. Loading starts at zero; pause and error freeze the last confirmed state; Retry explicitly starts a fresh attempt at zero. Skip/Continue show the exact selected result and retain observed kills, including zero when loading is skipped. Reentry resets all text, progress and announcements. Collection remains once only and independent of video or audio completion.

The HUD is a sibling of the cinema, so it does not cover the native action. Desktop uses a reserved right rail; portrait uses a strip below the film. The footer remains outside this grid, film containment is preserved, scrollable HUD content is keyboard reachable and buttons retain a 44-pixel minimum in short landscape. Kill feedback uses a short CSS pulse only, pauses during hold/error and is disabled for reduced motion. A polite atomic announcement changes only on a confirmed kill or phase transition. No extra timer or animation frame loop is added.

Source/VM checks do not prove rendered phone fit, audible synchronization or physical-device performance. Reference contact sheets are private source inspection, not browser screenshots.
