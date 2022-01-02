#!/usr/bin/env bash
set -euo pipefail
SERVICES_JSON="src/assets/pdok-wms-wmts-services.json"

function get-xpath-text(){
    xml_doc="$1"
    xpath="$2"
    set +e
    xmlstarlet sel -T \
        -N gmd="http://www.isotc211.org/2005/gmd" \
        -N gco="http://www.isotc211.org/2005/gco" \
        -N gmx="http://www.isotc211.org/2005/gmx" \
        -t -m "$xpath" \
        -v 'text()' - <<< "$xml_doc"
    set -e
}
result=""
count=0
while read -r LINE;do
    # if [[ $count -gt 5 ]];then # for debugging
    #     break
    # fi    
    MD_ID=$(jq -r ".id" <<< $LINE)
    URL="https://www.nationaalgeoregister.nl/geonetwork/srv/dut/csw?service=CSW&request=GetRecordById&version=2.0.2&outputSchema=http://www.isotc211.org/2005/gmd&elementSetName=full&ID=${MD_ID}"
    echo "processing record: ${URL}"
    MD_XML=$(curl -s $URL)
    SERVICE_URL=$(get-xpath-text "$MD_XML" "//gmd:transferOptions/gmd:MD_DigitalTransferOptions/gmd:onLine[1]/gmd:CI_OnlineResource/gmd:linkage/gmd:URL")
    if [[ -z $SERVICE_URL ]];then
        echo "SKIP: $SERVICE_URL"
        continue
    fi
    json_line=$(jq  -c ".serviceUrl = \"${SERVICE_URL}\"" <<< $LINE | sed "s/\r/\\r/" | sed "s/\n/\\n/")
    result="${json_line}${result}"
    count=$(bc<<<"$count+1")
done <<<$(jq -c '.[]' < $SERVICES_JSON)

echo "##############"
echo "$result"
jq -s '.' <<< "$result" > src/assets/pdok-wms-wmts-services-with-urls.json
