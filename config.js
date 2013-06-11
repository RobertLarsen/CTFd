{
    "status_port" : 8800,
    "port" : 6600,
    "database" : "ctfd",
    "start" : true,
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
            "name" : "Service 1",
            "manifest" : "services/SomeService/Manifest.json"
        },
        {
            "name" : "Service 2",
            "manifest" : "services/SomeService/Manifest.json"
        }
    ]
}
