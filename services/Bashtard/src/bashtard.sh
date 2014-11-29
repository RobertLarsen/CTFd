#!/bin/bash

BASHTARD_HOME=$(dirname "${0}")
T3H_FOLDER="${BASHTARD_HOME}/data"

test -d "${T3H_FOLDER}" || mkdir -p "${T3H_FOLDER}"

echo "***********************************************"
echo "*** Welcome to the Bashtard message service ***"
echo "***********************************************"

#Authenticate
echo -n "What is your name? "
read username
MY_FOLDER="${T3H_FOLDER}/${username}"
if ! test -d "${MY_FOLDER}"; then
    mkdir -p "${MY_FOLDER}/files"
    echo -n "Hmmm....I don't know you. New around here, huh? What will be your password? "
    read password
    echo -n "${password}" >> "${MY_FOLDER}/password.txt"
    echo "Wellcome ${username}. Hope you will find this service useful."
else
    echo -n "Welcome back ${username}. What is your password? "
    read password
    if test "${password}" == $(cat "${MY_FOLDER}/password.txt"); then
        echo "That was right."
    else
        echo "Bad password"
        exit 1
    fi
fi

function do_read(){
    count=$(ls ${MY_FOLDER}/files|wc -l)
    if test ${count} -gt 0; then
        echo -n "Which of your $(ls ${MY_FOLDER}/files | wc -l) files do you want to read? "
        read filename
        if test -f "${MY_FOLDER}/files/${filename}"; then
            cat "${MY_FOLDER}/files/${filename}"
            echo "-------------------"
        else
            echo "I don't know that file."
        fi
    else
        echo "You have no files"
    fi
}

function do_list_files(){
    ls "${MY_FOLDER}/files"
    echo "-------------------"
}

function do_write(){
    echo -n "Who do you want to write to? "
    read receiver
    HIS_FOLDER="${T3H_FOLDER}/${receiver}"
    if test -d "${HIS_FOLDER}"; then
        echo -n "What do you want to say to ${receiver}? "
        read message
        echo "${message}" > "${HIS_FOLDER}/files/$(date +'%Y-%m-%d %H:%M:%S') - ${username}"
        echo "Thanks!"
    else
        echo "I don't know ${receiver}"
    fi
}

function do_list_users(){
    ls "${T3H_FOLDER}"
    echo "-------------------"
}

function do_quit(){
    echo "Goodbye"
    exit 0
}

while true; do
    echo -n "What do you want to do? "
    read action
    if hash "do_${action}" 2>/dev/null; then
        "do_${action}"
    else
        echo "I don't know how to do that."
    fi
done
