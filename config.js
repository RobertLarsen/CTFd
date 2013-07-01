{
    "web" : {
        "port" : 8900,
        "document_root" : "./html"
    },
    "scores_port" : 8900,
    "status_port" : 8800,
    "port" : 6600,
    "database" : "ctfd",
    "start" : false,
    "check_interval" : 2000,
    "plant_interval" : 10000,
    "teams" : [
        {
            "name" : "Team 1",
            "host" : "192.168.0.1"
        },
        {
            "name" : "Team 2",
            "host" : "192.168.0.2"
        }
    ],
    "services" : [
        {
            "name" : "Phasebook",
            "manifest" : "services/SomeService/Manifest.json"
        },
        {
            "name" : "Secret Service",
            "manifest" : "services/SomeService/Manifest.json"
        },
        {
            "name" : "Yellow Pages",
            "manifest" : "services/SomeService/Manifest.json"
        }
    ]
}
