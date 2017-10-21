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
    "plant_interval" : 30000,
    "points" : {
        "deliver" : 1,
        "capture" : 2,
        "defend" : 1,
        "check" : 1
    },
    "teams" : [
        { "name" : "Ring0", "host" : "localhost" },
        { "name" : "Darkside Inc", "host" : "localhost" },
        { "name" : "Tykhax", "host" : "localhost" },
        { "name" : "def4ult", "host" : "localhost" },
        { "name" : "Pwnies", "host" : "localhost" },
        { "name" : "Hack n Slash", "host" : "localhost" },
        { "name" : "EuroNOP", "host" : "localhost" },
        { "name" : "Dont Mind Us", "host" : "localhost" },
        { "name" : "Secure Noodle Squad", "host" : "localhost" },
        { "name" : "Majskinke", "host" : "localhost" }
    ],
    "services" : [
        { "name" : "HighLow", "manifest" : "/home/robert/code/CTF3/services/SomeService/Manifest.json" },
        { "name" : "Phasebook", "manifest" : "/home/robert/code/CTF3/services/SomeService/Manifest.json" },
        { "name" : "SecretService", "manifest" : "/home/robert/code/CTF3/services/SomeService/Manifest.json" },
        { "name" : "YellowPages", "manifest" : "/home/robert/code/CTF3/services/SomeService/Manifest.json" },
        { "name" : "RockPaperScissorLizardSpock", "manifest" : "/home/robert/code/CTF3/services/SomeService/Manifest.json" },
        { "name" : "FileServer", "manifest" : "/home/robert/code/CTF3/services/SomeService/Manifest.json" }
    ]
}
