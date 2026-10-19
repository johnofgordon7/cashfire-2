# Interface contract

The inherited four-reel layout and IG 1.0.0 controls remain. Keep gameplay within the viewport with persistent header/footer, no page scrolling, a primary action centered independently of side controls, four visible reels and reserved result space. Depot artwork belongs behind this geometry, without covering symbols or controls.

The anchored stake overlay retains its internally scrolling three-column grid, slider, 18 stakes, modal focus and keyboard behavior. Stake changes lock while a round is accepted. Sound/Turbo start off; finite autoplay stops on a feature.

## Film before result

Three boxes start Shooting Spree; four start Mega Spree. The base guide uses those feature names rather than advance fixed multipliers. Do not advertise a fabricated minimum, maximum or random prize range. Exact internal arithmetic remains available in Labs and technical documentation.

The bonus header contains `bonusTitle`, `bonusStake` and a discreet `bonusPrototype` marker. Remove the advance ledger and `bonusRange`, `bonusPrize` and `bonusAmount` fields. The film, loading feedback and playback/recovery controls are the focus.

Clear `bonusFinalPrize` and `bonusFinalAmount` on opening. Populate them only in the reveal phase after completion, explicit Skip or recovery Continue. Keep pre-film review returns blank too. Do not leak prior results through hidden content, live regions or accessibility announcements. A title/feature-entry cue may identify the bonus, but a large win or win audio belongs at final reveal.

Show the actual final returned credits and distinguish them from the accepted stake/net result. Return to reels collects once. Pause, Skip, Retry and Return must stay reachable around the full contained native frame and cannot alter the award. A partial base return or break-even gets no profit celebration.

## Adaptation and feedback

Use existing runtime vectors and Inter for shared controls. Game art/effects stay within the playable region. Normal/Mega retain distinct titles and treatments; a discreet PROTOTYPE label remains readable. Keep depot visual identity separate from the source electrical scene without changing control silhouettes.

Bonus phase signals may coordinate host ambience and FX. Settlement cannot wait for audio loading/playback. Keep mute and hidden-tab behavior intact. Document only the provenance and verification of assets actually shipped.

Reference viewports: 320Ã—568, 375Ã—812, 390Ã—844, 430Ã—932, 844Ã—390 and 1194Ã—834. Automated policy checks, rendered inspection, audible listening and physical-device validation are separate.

## Free prototype shortcuts

The existing three- and four-box indicators contain native buttons with keyboard operation, visible focus, disabled state and a shared short prototype hint. Accessible names identify a free preview and the selected example stake. Controls disable while loading, spinning, autoplaying, editing Labs or presenting a bonus, and the click handler independently checks the same state. These shortcuts use the existing preview path, not a forced paid spin.

Entry states FREE PREVIEW and EXAMPLE STAKE. During the film, a clearly labelled example running return may track confirmed kills. Only after completion, Skip or recovery Continue may the final example return appear. Preview result/recovery copy states that no demo credits were used or awarded and omits a net-profit claim. Returning closes the preview without changing balance, last win, session net, stake or result-generator calls. Natural triggered bonuses retain accepted-round settlement and their existing money wording.

## Kill and return HUD

The synchronized meter is beside the contained film on desktop and below it in portrait. It shows confirmed footage kills, the current running multiplier and stake-scaled cash. Free previews label all money as examples. Do not overlay the action, show future monetary targets or claim that aiming changes an award. The last kill holds the previous tier with Extraction pending; only reveal shows the final accepted amount. See `kill-progress.md` for exact source mapping, pause/retry/skip behavior and accessibility requirements.
