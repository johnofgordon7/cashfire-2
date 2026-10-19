# Cashfire 2 mechanics

Cashfire 2 v1.2.0 is a separate SHOWCASE demo derived from Live Wire. Fixed 5×/1,000× bonus values demonstrate the requested presentation and flow; they are not a tuned or optimized gambling model. Base probabilities remain unchanged, with no RTP-target rebalance. It retains the four mechanical reels, controls, viewport layout, reel probabilities and accepted-round settlement flow. A loot box replaces the lightning-bolt symbol; X remains non-paying. Three boxes always award 5× and enter Shooting Spree. Four always award 1,000× and enter Mega Shooting Spree. Boxes count on any reel, including across Xs.

## Verified source boundary

The exact inspected source baseline is Live Wire Site version 42, commit `3fa040ef025b46ae4c887854a2f7181692365890`, saved 8 October 2026. The connected Site reports version 43, commit `c86ec80716c2dfc33bca07a96d6fb5e282f5fe81`. Its source was unavailable for comparison. Preservation of the retained layout, controls and reel model is against verified v42; equivalence to v43 source remains unverified. The original project and version history are unchanged.

The runnable baseline's `dist/results-api.js` and `dist/bonus.js` establish its inherited model. Its older README describes a superseded count model and is not a source for defaults. Cashfire 2 v1.2.0 deliberately replaces the baseline bonus-prize distributions with the two fixed returns below.

## Default outcome model

Each of four reels independently displays a loot box with probability 20%, otherwise X. The count distribution is binomial.

| Boxes | Exact probability | Total return, including returned stake | Bonus footage |
| --- | ---: | ---: | --- |
| 0 | 40.96% | 0× | None |
| 1 | 40.96% | 0.2× | None |
| 2 | 15.36% | 1× | None |
| 3 | 2.56% | 5×, fixed | Warehouse Clear: extraction-five |
| 4 | 0.16% | 1,000×, fixed | Full Assault: extraction-max |

These fixed values are showcase behavior. There is no conditional bonus-prize draw. Each supported trigger has one prize and one film. The exact theoretical demo return is `0.4096 × 0.2 + 0.1536 × 1 + 0.0256 × 5 + 0.0016 × 1000 = 1.96352`, or **196.352%**. This is the calculated expected return of the default local demo model, not a certified RTP or a real-money integration. Session returns vary. The base guide names Shooting Spree and Mega Spree without advance fixed multipliers or invented ranges. A discreet PROTOTYPE marker identifies the demonstration. The calculated return above and fixed mapping are internal technical data, not player-facing suspense copy, a balancing target or an instruction to retune probabilities.

## Accepted round and presentation

The stake locks before a result is drawn. Validation of the outcome and animation plan precedes the debit; an invalid draw charges nothing. The accepted box count fixes the bonus multiplier before the film starts. Presentation cannot redraw, multiply or replace that award. A normal or Mega trigger stops autoplay. Return to the reels settles the accepted award once, in integer pence.

Entry shows only mode, stake and prototype status. The advance award ledger and fixed-prize subtitle are removed. Clear final multiplier/amount fields on each opening and keep them blank while loading, playing, paused or in media recovery. Film completion, explicit Skip or recovery Continue reveals the actual final win; Return to reels then collects it. Do not emit an early win announcement or leave a previous result in hidden/live-region content. Review fixtures follow this same order.

Normal always plays `call-of-booty-extraction-five.mp4`; Mega always plays `call-of-booty-extraction-max.mp4`. These are finite byte-exact source clips. No alternate film rotation, cutout enemies, new montage or film loop is used. The existing maximum clip contains an editorial insert in its original source.

Footage kills are visual progress, separate from payout authority. Neither a visible kill count nor a media error changes the fixed multiplier. The earlier Cashfire showcase average is not used. Additional footage is needed only for a future design requiring different action or a literal new kill-to-cash presentation.

Net result equals total returned credits minus the full accepted stake: zero return is a loss, 0.2× is a partial return and 1× breaks even. Partial return and break-even receive no profit styling. A £1 accepted normal trigger returns £5, for £4 net; a £1 Mega trigger returns £1,000, for £999 net.

## Preserved controls and defaults

- Demo balance: £5,000.00 per new page session. Default stake: £1.00.
- Stakes: £0.10, £0.20, £0.40, £0.60, £0.80, £1, £2, £3, £4, £5, £6, £7, £8, £9, £10, £20, £30 and £50.
- Play or Space; anchored three-column stake picker and slider; Turbo and Sound initially off.
- Finite autoplay: 10, 25, 50 or 100 spins, initially 10. Stop after the current accepted spin or on a feature.
- Persistent header, balance, session time/net and footer bet/last return; centered primary action; four visible reels; compact collection and return key.
- Rules, Controls and Demo & Labs tabs; idle refill to £5,000; non-paying bonus previews. No bonus-buy mechanism.
- Labs edits are session-only; refresh restores defaults. The fixed 5×/1,000× bonus returns remain locked when editing base returns or frequencies.
- Two confirmed boxes add anticipation on remaining reels; three with one remaining add stronger anticipation. The next symbol never determines that cue.
- Hidden-tab pause suspends local gameplay time and audio. Resume must not duplicate an award. Reduced-motion presentation is supported.

## Outcomes review isolation

`outcomes.html` is independent. Its fixture iframe loads `review.html`, not the playable `index.html`. Neither review document imports `live.js`, `results-api.js` or the playable wallet. Fixed fixture credits and a £1 preview stake are display-only. Normal and Mega fixtures reuse production bonus presentation with `preview: true` and the same fixed prize/film mappings. Selecting a fixture never forces a playable draw or changes stake, balance or RNG.

Implementation and verification are separate in the coverage catalogue. Earlier-version observations do not validate v1.2.0 entry/reveal timing, stale-result cleanup or phase-audio behavior. Automated checks do not certify physical-device rendering, audible playback, backend recovery or v43 source equivalence.
