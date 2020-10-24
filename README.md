# ⏳ Fallow - Socket Service



#### What is fallow ❓

This is the demonized socket application for a COVID-19 fallow timer application. In short, fallow time is how long a dental operatory must sit before aerosols settle and a room is considered "safe". This demonized application helps manage those timers in a multi-tenant concept.

#### What is Socket-Service? ⚡

Socket-Service is a Kubernetes cluster able socket.io server. The nodes in the cluster communicate via clustered Redis. Fallow was built in a GCP-First fashion so we leverage Google Cloud Datastore as the main database. 

#### How can I use this? 🔌

This project is open source for transparency, unlike other projects you cannot host this on your own as you are missing key pieces. Pieces such as the authentication provider it integrates with is proprietary. If you would like to use Fallow, please send me an email.

