# Cashfire 2 mechanics

Cashfire 2 is a separate demo derived from the original Live Wire. It retains the four mechanical reels, controls, viewport layout and accepted-round settlement flow. A loot box replaces the lightning-bolt symbol; X remains the non-paying symbol. Three loot boxes enter Shooting Spree, and four enter Mega Shooting Spree. Boxes count on any reel, including across Xs.

## Verified source boundary

The exact locally inspected source is Live Wire Site version 42, commit `3fa040ef025b46ae4c887854a2f7181692365890`, saved 8 October 2026. The connected Site reports a newer version 43, commit `c86ec80716c2dfc33bca07a96d6fb5e282f5fe81`. Its source was unavailable for comparison. Accordingly, preservation claims are against the verified v42 runnable source; equivalence to v43 is unverified. The original project and its version history are unchanged.

`dist/results-api.js` and `dist/bonus.js` in the verified source are authoritative. Its older README describes an obsolete 97% count model and must not be used for defaults.

## Default outcome model

Each of four reels independently displays a loot box with probability 20%, otherwise X. The resulting count distribution is binomial, not a uniformly selected showcase round.

| Boxes | Exact probability | Total return, including returned stake |
| --- | ---: | --- |
| 0 | 40.96% | 0× |
| 1 | 40.96% | 0.2× |
| 2 | 15.36% | 1× |
| 3 | 2.56% | Normal bonus prize |
| 4 | 0.16% | Mega bonus prize |

Normal bonus distribution:

| Total return | 10× | 15× | 20× | 30× | 50× | 100× |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Conditional probability | 60% | 10% | 10% | 10% | 5% | 5% |

Mega bonus distribution:

| Total return | 30× | 50× | 100× | 250× | 500× | 1,000× |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Conditional probability | 50% | 20% | 10% | 10% | 4% | 6% |

The conditional means are 20× and 140×. The exact theoretical demo return is `0.4096 × 0.2 + 0.1536 × 1 + 0.0256 × 20 + 0.0016 × 140 = 0.97152`, or **97.152%**. This is a mathematical property of the local demo model, not a certified RTP or a real-money integration. Session returns vary. The front end shows “Win up to 100×” and “Win up to 1,000×”. Conditional averages are technical model data and are not shown as player-facing bonus prizes.

## Accepted round and presentation

The selected stake locks before a result is drawn. The game validates the outcome and animation plan before deducting credits. An invalid draw charges nothing. The accepted spin owns its final bonus multiplier before the bonus film starts. The presentation cannot redraw, multiply or replace that award. A normal or Mega trigger stops autoplay; return from the bonus settles the original award once.

The Cashfire films are finite native presentations. A film's visible action is not a mathematical kill paytable. Its on-screen kills must not be represented as authoritative awarded cash. The accepted Live Wire award remains separate and explicit. The five-film showcase's 201.2× average is not used as payout authority. New footage is necessary if every possible accepted prize must be literally encoded in unique action footage; the existing five films do not encode every supported monetary prize.

Net result equals total returned credits minus the full accepted stake: zero return is a loss, 0.2× is a partial return, and 1× breaks even. Neither partial return nor break-even receives profit styling.

## Preserved controls and defaults

- Demo balance: £5,000.00 at each new page session. Default stake: £1.00.
- Stake options: £0.10, £0.20, £0.40, £0.60, £0.80, £1, £2, £3, £4, £5, £6, £7, £8, £9, £10, £20, £30 and £50.
- Play button or Space; anchored three-column stake picker and slider; Turbo initially off; Sound initially off.
- Finite autoplay: 10, 25, 50 or 100 spins, initially 10. Stop after the current accepted spin.
- Persistent header, demo balance, session time/net, footer bet/last return; centered primary action; all four reels visible; compact collection and return key.
- Rules, Controls and Demo & Labs tabs; idle refill to £5,000; separate non-paying bonus previews. No bonus-buy mechanism exists in the verified original.
- Labs edits are session-only. Default refresh restores the model. The 20×/140× bonus means remain fixed when editing base returns or frequencies.
- Two confirmed boxes add anticipation on remaining reels; three with one remaining adds stronger anticipation. The next symbol never determines the anticipation cue.
- Hidden-tab pause suspends gameplay time and audio. Resume must not duplicate an award. Reduced-motion presentation remains supported.

## Outcomes review isolation

`outcomes.html` is an independent review surface. Its fixture iframe loads `review.html`, not the playable `index.html`. Neither review document imports `live.js`, `results-api.js` or the playable wallet. Fixed fixture credits and £1 preview stake are display-only. Normal and Mega fixtures reuse the production bonus presentation with `preview: true`. Selecting a fixture never forces a playable draw or changes a selected stake, balance or RNG. Review results are previews, not proof of natural random entry or real-money recovery.

Review fixture verification is recorded separately from implementation in the coverage catalogue. Passed automated checks do not certify physical-device rendering, audio listening, backend recovery or a v43 source comparison.
