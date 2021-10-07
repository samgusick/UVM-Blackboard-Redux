
var tabId;
var linksExist = false;

window.addEventListener('load', function (e) {
    if (document.getElementById("user_id") != null || document.getElementById("user_id") != undefined) {
        chrome.runtime.sendMessage({ msg: "notLoggedIn" });
    }

    if (window.location.href.includes("bb.uvm.edu/webapps/portal/")) {
        // Call the below function
        waitForElementToDisplay(function () {
            scrapeClassLinks();
        }, 1000, 9000);

    }
    if (window.location.href.includes("myGrades")) {
        // Call the below function
        var gradesObj = scrapeGrades();
        console.log("made it");
        chrome.runtime.sendMessage({ msg: "gradeData", name: gradesObj.name, categories: gradesObj.categories, unweighted_grades: gradesObj.grades });
    }


});


function waitForElementToDisplay(callback, checkFrequencyInMs, timeoutInMs) {
    var startTimeInMs = Date.now();
    (function loopSearch() {
        if (document.getElementById("div_4_1").getElementsByTagName("a").item(0) != null) {
            callback();
            return;
        }
        else {
            setTimeout(function () {
                if (timeoutInMs && Date.now() - startTimeInMs > timeoutInMs)
                    return;
                loopSearch();
            }, checkFrequencyInMs);
        }
    })();
}

function scrapeClassLinks() {

    var links;

    links = document.getElementById("div_4_1").getElementsByTagName("a");


    var classNames = [];
    var myList = [];

    for (item of links) {
        classNames.push(item.textContent);
    }


    for (let index = 0; index < links.length; index++) {
        // store a copy of the original URL
        var originalUrl = links[index].href;
        // find the course ID in the URL
        var classId = originalUrl.substr(originalUrl.indexOf("_") + 1, originalUrl.lastIndexOf("_"));
        // create the new URL which is the grades page
        var finalURL = "https://bb.uvm.edu/webapps/bb-mygrades-bb_bb60/myGrades?course_id=_" + classId + "_1&stream_name=mygrades&is_stream=false";
        // put it in the array
        myList.push(finalURL);

    }

    chrome.runtime.sendMessage({ msg: "urlList", urlList: myList, classNames: classNames, tab: tabId });



}

chrome.runtime.onMessage.addListener(function (message, sender) {
    if (message.message == "scrapeGrades") {
        var gradesObj = scrapeGrades();
        chrome.runtime.sendMessage({ msg: "gradeData", name: gradesObj.name, categories: gradesObj.categories, unweighted_grades: gradesObj.grades, nextClassUrl: message.nextClassUrl, nextClassIndex: message.nextClassIndex, tabId: message.tabId });
    }
    else if (message.message == "scrapeLinks") {
        tabId = message.tabId;

        //scrapeClassLinks();
    }
});



function getGradeObject(grade_string) {

    var total_points;
    var total_total;

    // if the grade includes the characters / .....
    if (grade_string.includes("/")) {
        //get the entire string
        var wholeGrade = grade_string;

        // choose where to split the grade at the slash
        var splitPoint = wholeGrade.indexOf("/");

        // split the string into two (first/second half of slash)
        var points = wholeGrade.substring(0, splitPoint);
        var total = wholeGrade.substring(splitPoint + 1);

        total_points = parseFloat(points);

        total_total = parseFloat(total);
    }

    // if there's no slash, it's a percent and must be treated like so
    else if (grade_string.includes("%")) {
        var isolated_string = "";

        var index = 0;
        var convertedPercent = "";

        while (grade_string[index] != '%') {
            convertedPercent += grade_string[index];
            index++;
        }


        total_points = parseFloat(convertedPercent);
        total_total = 100.0;

    }

    else if (isNaN(grade_string)) {

        switch (grade_string) {
            case "A+":
                total_points = 100;
                total_total = 100;
                break;

            case "A":
                total_points = 95;
                total_total = 100;
                break;

            case "A-":
                total_points = 90;
                total_total = 100;
                break;

            case "B+":
                total_points = 89;
                total_total = 100;
                break;

            case "B":
                total_points = 85;
                total_total = 100;
                break;

            case "B-":
                total_points = 80;
                total_total = 100;
                break;

            case "C+":
                total_points = 79;
                total_total = 100;
                break;

            case "C":
                total_points = 75;
                total_total = 100;
                break;

            case "C-":
                total_points = 70;
                total_total = 100;
                break;

            case "D+":
                total_points = 69;
                total_total = 100;
                break;

            case "D":
                total_points = 65;
                total_total = 100;
                break;

            case "D-":
                total_points = 60;
                total_total = 100;
                break;

            case "F":
                total_points = 0;
                total_total = 100;
                break;

            default:
                break;



        }
    }

    return (total_points / total_total);
}

function scrapeGrades() {

    // get the course name, the graded row elements
    var graded_rows = document.getElementsByClassName("sortable_item_row graded_item_row row expanded");
    var upcoming_rows = document.getElementsByClassName("sortable_item_row upcoming_item_row row expanded");
    var submitted_rows = document.getElementsByClassName("sortable_item_row submitted_item_row row expanded");
    var calculated_rows = document.getElementsByClassName("sortable_item_row calculatedRow row expanded");


    var classWeightCats = [];
    var classGradesNums = [];



    for (let index = 0; index < graded_rows.length; index++) {

        // get the raw text in the assignment grade section
        var rawGrade = graded_rows[index].getElementsByClassName("cell grade")[0];


        // if the the grade is not null and the grade is a number...
        if (rawGrade != null && graded_rows[index].getElementsByClassName("tooltip")[0] == null) {

            // get the raw grade
            var raw_grade = getGradeObject(rawGrade.textContent.replace(/\s/g, ''));

            if (!isNaN(raw_grade)) {
                console.log(raw_grade);

                try {
                    raw_grade_category = graded_rows[index].getElementsByClassName("itemCat")[0].textContent;
                } catch (error) {
                    raw_grade_category = "other";
                }

                try {
                    var assignmentName = graded_rows[index].getElementsByClassName("cell gradable")[0].textContent.replace(/\s/g, '');
                } catch (error) {
                }


                var catExists = false;

                for (let index = 0; index < classWeightCats.length; index++) {
                    if (classWeightCats[index] == raw_grade_category) {
                        catExists = true;
                    }
                }


                if (!catExists) {
                    classWeightCats.push(raw_grade_category);
                    classGradesNums.push({ value: 0, size: 0 });
                }


                for (let index = 0; index < classWeightCats.length; index++) {
                    if (classWeightCats[index] == raw_grade_category) {
                        console.log(classGradesNums[index]);
                        classGradesNums[index].value = classGradesNums[index].value + raw_grade;
                        classGradesNums[index].size = classGradesNums[index].size + 1;

                    }

                }
            }



        }
    }

    var courseName = document.getElementsByClassName("courseName")[0].textContent;
    var final_raw_grades = [];
    classGradesNums.forEach(element => {
        var grade = element.value / element.size;
        //console.log(element.value + " ," + element.size)
        final_raw_grades.push(grade);
    });
    return {
        categories: classWeightCats,
        grades: final_raw_grades,
        name: courseName
    }
}


