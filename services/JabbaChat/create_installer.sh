#!/bin/bash

OPENFIRE_FILE=openfire_3_8_2.tar.gz
MONGO_INTERFACE_FILE=jabba-database.jar 
MONGO_INTERFACE=dist/${MONGO_INTERFACE_FILE}
MONGO_DRIVER_FILE=mongo-java-driver-2.11.2.jar
MONGO_DRIVER=lib/${MONGO_DRIVER_FILE}
OPENFIRE_URL="http://www.igniterealtime.org/downloadServlet?filename=openfire/${OPENFIRE_FILE}"

INSTALL_FILE=jabba.tar.gz
INSTALL_SCRIPT=jabba_installer.sh

JABBA_DOMAIN=ctf.dk

echo "Building MongoDB interface for Openfire"
ant -q >/dev/null 2>&1

#Retrieve Openfire
echo "Retrieving Openfire"
test -f ${OPENFIRE_FILE} || wget -q -O ${OPENFIRE_FILE} "${OPENFIRE_URL}"

echo "Packaging client data"
tar czf ${INSTALL_FILE} --exclude node_modules --transform 's/dist\///' --transform 's/lib\///' ${OPENFIRE_FILE} ${MONGO_INTERFACE} ${MONGO_DRIVER} www component

size=$(ls -l ${INSTALL_FILE} | awk '{print $5}')
cat >${INSTALL_SCRIPT}<<EOF
#!/bin/bash

tail -c ${size} \${0} | tar xz
tar xfz ${OPENFIRE_FILE}
mv ${MONGO_DRIVER_FILE} openfire/lib
mv ${MONGO_INTERFACE_FILE} openfire/lib
./openfire/bin/openfire start && sleep 5

exit
EOF
cat ${INSTALL_FILE} >> ${INSTALL_SCRIPT}
rm ${INSTALL_FILE}
