#!/bin/bash

cd $(dirname ${0})
rm -f ${1}.stop
while ! test -f ${1}.stop; do
    ./${1}
done
