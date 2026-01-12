# svb-stress-simulator
Browser based bank simulator modeling balance sheet vulnerabilities and how they compund into liquidity crises. Inspired by Silicon Valley Bank Collapse March 2023 
# Bank Stress Simulator (SVB-Inspired)

**Built by:** Kayton Dean  
**Live Demo:** https://kaytondean.github.io/svb-stress-simulator/  

## Overview
This project is an interactive web simulator that models SVB-style bank fragility dynamics. Users can adjust interest-rate shocks, uninsured deposit ratios, securities duration, unrealized losses, withdrawal speed, and depositor concentration to see how risk factors can compound into liquidity stress.

## Features
- Slider-based scenario modeling with real-time stress score updates  
- SVB / Stable / High Rate Shock / Digital Run presets  
- Driver breakdown chart + stress-over-time chart  
- Transparent scoring model (interpretable, prototype-focused)

## Model Notes
This is an educational prototype inspired by themes from my SVB research. It is not a regulatory model or investment tool. Future iterations could calibrate weights using bank call report datasets and formal stress testing methodologies.

## Tech Stack
- HTML/CSS/JavaScript
- Chart.js

## Run Locally
Just open `index.html` in a browser, or use VS Code Live Server.

## Future Work
- Calibrate model parameters using publicly available bank datasets  
- Add scenario replay + exportable reports  
- Improve unrealized loss estimation with more realistic duration/convexity assumptions
