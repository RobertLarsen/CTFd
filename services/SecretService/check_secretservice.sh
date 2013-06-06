#!/bin/bash

LOW_PORT=10000
HIGH_PORT=50000
SS_CLIENT=./ss_client.rb

#$1 Host
#$2 Flag name
#$3 Flag data
function PlantFlag(){
    host=${1}
    name=${2}
    data=${3}
    ${SS_CLIENT} ${host} ${LOW_PORT} ${HIGH_PORT} put ${name} ${data} >/dev/null && exit 0 || exit 1
}

#$1 Host
#$2 Flag name
#$3 Flag data
function CheckFlag(){
    host=${1}
    name=${2}
    data=${3}
    res=$(${SS_CLIENT} ${host} ${LOW_PORT} ${HIGH_PORT} get ${name})
    test "${res}" = "${data}" && exit 0 || exit 1
}

#$1 Host
function PrivilegeEscalationExploitable(){
    host=${1}
    ${SS_CLIENT} ${host} ${LOW_PORT} ${HIGH_PORT} num>/dev/null
}

#$1 Host
function SQLInjectionExploitable(){
    host=${1}
    r1=$RANDOM
    r2=$RANDOM
    sum=$((r1+r2))
    res=$(${SS_CLIENT} ${host} ${LOW_PORT} ${HIGH_PORT} get "' and 1=2 union select $r1+$r2 where '1'='1")
    test "${res}" = "${sum}"
}

#$1 Host
function Exploitable(){
    host=${1}
    count=0
    PrivilegeEscalationExploitable ${host} && count=$((count+1))
    SQLInjectionExploitable ${host} && count=$((count+1))
    echo "Found ${count} exploitable vulnerabilities in ${host}"
    test ${count} -eq 0 && false || true
}

function Help(){
    echo "Usage: ${0} -p <host> <flagname> <flagdata>"
    echo "       ${0} -c <host> <flagname> <flagdata>"
    echo "       ${0} -e <host>"
    echo ""
    echo "  -p  Plant flag"
    echo "  -c  Check flag"
    echo "  -e  Check exploitability"
}

while test -n "${1}"; do
    case ${1} in
        --low-port) LOW_PORT="${2}"; shift;;
        --high-port) HIGH_PORT="${2}"; shift;;
        --client) SS_CLIENT="${2}"; shift;;
        *) break;;
    esac
    shift
done

case $1 in
    "-p")
        PlantFlag $2 $3 $4
        ;;
    "-c")
        CheckFlag $2 $3 $4
        ;;
    "-e")
        Exploitable $2
        ;;
     *)
        Help
        ;;
esac

