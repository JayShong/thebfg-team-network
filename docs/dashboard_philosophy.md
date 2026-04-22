# Dashboard Philosophy: Building Trust

## Purpose
The Home Dashboard is the face of the Conviction Network. It is designed to demonstrate scale, momentum, and impact to both members and guests.

1. **Social Proof**: By showing the number of consumers and businesses, we prove that the movement is real.
2. **Impact Transparency**: Real-time (or near real-time) tracking of environmental and social contributions (waste, trees, jobs) validates the "Empathy Economy" model.
3. **Guest Onboarding**: Guests should see the scale of the network immediately upon landing, encouraging them to join.

## Data Integrity
- **Live Counts**: Admins see live counts from the database to ensure no "double counting" or "lost counts".
- **Public Cache**: To maintain security, a public `system/stats` document is used for non-admins, which is periodically synced by administrators.

## Evolution
This dashboard transitioned from static counters to query-based verification in v0.95 to ensure that the numbers reported are always backed by actual records in the database.
