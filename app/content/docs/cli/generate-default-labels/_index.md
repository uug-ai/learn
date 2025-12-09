---
title: "Generate default labels"
description: ""
lead: ""
date: 2020-10-06T08:49:15+00:00
lastmod: 2020-10-06T08:49:15+00:00
draft: false
images: []
weight: 2

---

This tool adds starting labels to existing users in the database.

#### Command Line Arguments

- `-action`: The action to take (required). For labels, use `generate-default-labels`.
- `-mongodb-uri`: The MongoDB URI (optional if host and port are provided).
- `-mongodb-host`: The MongoDB host (optional if URI is provided).
- `-mongodb-port`: The MongoDB port (optional if URI is provided).
- `-mongodb-source-database`: The source database name (required).
- `-mongodb-database-credentials`: The database credentials (optional).
- `-mongodb-username`: The MongoDB username (optional).
- `-mongodb-password`: The MongoDB password (optional).
- `-label-names`: The names of the labels to add. Comma separated. Will add predefined default values if not provided.
- `-username`: A specific user to add labels to (optional).
- `-mode`: You can choose to run a `dry-run` or `live`.

#### Example

To run the default label generation, use the following command:

```sh
go run main.go -action generate-default-labels \
               -mode dry-run \
               -mongodb-uri "mongodb+srv://<username>:<password>@<host>/<database>?retryWrites=true&w=majority&appName=<appName>" \
               -mongodb-source-database=<sourceDatabase> \
               -label-names=<labelNames> \

```

Add -username to add labels to just one specific user