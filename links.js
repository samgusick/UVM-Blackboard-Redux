function scrapeClassLinks() {
    var links = document.getElementById("div_4_1").getElementsByTagName("a");

    var classNames = [];
    var myList = [];

    console.log(links);
    console.log(links.length);
    for (item of links) {
        //classNames.push(item.textContent);
        console.log("made it");
    }

    // for (let index = 0; index < links.length; index++) {
    //     classNames.push(links[index].textContent);
    //     console.log(classNames);
    // }

    // for (let index = 0; index < links.length; index++) {
    //     // store a copy of the original URL
    //     var originalUrl = links[index].href;
    //     // find the course ID in the URL
    //     var classId = originalUrl.substr(originalUrl.indexOf("_") + 1, originalUrl.lastIndexOf("_"));
    //     // create the new URL which is the grades page
    //     var finalURL = "https://bb.uvm.edu/webapps/bb-mygrades-bb_bb60/myGrades?course_id=_" + classId + "_1&stream_name=mygrades&is_stream=false";
    //     // put it in the array
    //     myList.push(finalURL);
        
    // }


    chrome.runtime.sendMessage({ msg: "urlList", urlList: myList, classNames: classNames, tab: tabId });


}