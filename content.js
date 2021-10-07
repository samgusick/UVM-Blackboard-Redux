// listen for the message with the instruction to send back a class
chrome.runtime.onMessage.addListener(function (message, sender) {

    if ((document.getElementById("pageTitleText") != null)) {
        if (document.getElementById("pageTitleText").innerHTML.includes("Error")) {
            chrome.runtime.sendMessage({ msg: "notLoggedIn", id: message.tab_id })
            return;
        }

        else if (document.getElementById("pageTitleText").innerHTML.includes("Access Denied")) {
            chrome.runtime.sendMessage({ msg: "nonExistentClass", id: message.tab_id })
            return;
        }
    }




    // check if the message is the "get" message
    if (message.msg == "get") {
        // create a class object to store the info
        var bb_class = {
            name: "Error, Failed to get class from BB",
            type: "bbClassObject",
            grade: "",
            url: "none",
            tab_id: 0,
            msg: "content",
            weights: []
        }

        // gather the necessary info from the page and put it in the object
        bb_class.name = document.getElementsByClassName("courseName")[0].textContent;

        if (message.weight.length == 0) {
            bb_class.weights = getNewWeights();
        }
        else {
            bb_class.weights = message.weight;
        }
        bb_class.grade = calculate(bb_class.weights);
        bb_class.url = message.url.replace(/\s/g, '');
        bb_class.tab_id = message.tab_id;
        // send a message back to the pop up with the new object class

        chrome.runtime.sendMessage(bb_class);
    }
    else if (message.msg == "getAll") {

        waitUntilLoaded(message.tab_id);
    }

});

function waitUntilLoaded(this_tab_id) {
    if (document.getElementById("div_4_1").getElementsByTagName("a").length == 0) {
        setTimeout(waitUntilLoaded, 100);
    } else {
        var links = document.getElementById("div_4_1").getElementsByTagName("a");
        var myList = [];
        for (let index = 0; index < links.length; index++) {
            var single_url = links[index].href;
            myList.push(single_url);
        }
        chrome.runtime.sendMessage({ msg: "sendAll", URLlist: myList, tab_id: this_tab_id });
    }
}


function getNewWeights() {
    var graded_rows_categories = document.getElementsByClassName("itemCat");
    default_weights_array = [];

    for (let index = 0; index < graded_rows_categories.length; index++) {
        
        if (default_weights_array[0] == undefined || default_weights_array[0] == null)
        {
            if (graded_rows_categories[index].textContent == undefined) {
                default_weights_array.push({ category: "other", value: 1 });
            }
            else {
                default_weights_array.push({ category: graded_rows_categories[index].textContent, value: 1 });
            }
        }

        var categoryInList = false;
        for (let index2 = 0; index2 < default_weights_array.length; index2++) {
            if (default_weights_array[index2].category == graded_rows_categories[index].textContent) {
                categoryInList = true;
            }
        }

        if (!categoryInList) {
            if (graded_rows_categories[index].textContent == undefined) {
                default_weights_array.push({ category: "other", value: 1 });
            }
            else {
                default_weights_array.push({ category: graded_rows_categories[index].textContent, value: 1 });
            }
        }
    }


    return default_weights_array;

}

// calculates
function calculate(passed_in_weights) {
    // get the course name, the graded row elements
    var raw_grades = [];

    var graded_rows = document.getElementsByClassName("sortable_item_row graded_item_row row expanded");
    var upcoming_rows = document.getElementsByClassName("sortable_item_row upcoming_item_row row expanded");
    var submitted_rows = document.getElementsByClassName("sortable_item_row submitted_item_row row expanded");
    var calculated_rows = document.getElementsByClassName("sortable_item_row calculatedRow row expanded");

    // in the calculation, check the category and its corressponding assignment 
    for (let index = 0; index < graded_rows.length; index++) {

        // get the raw text in the assignment grade section
        var rawGrade = graded_rows[index].getElementsByClassName("cell grade")[0];

        // if the the grade is not null and the grade is a number...
        if (rawGrade != null && !isNaN(parseFloat(rawGrade.textContent)) && graded_rows[index].getElementsByClassName("tooltip")[0] == null) {

            // get the raw grade
            var raw_grade = getGradeObject(rawGrade.textContent.replace(/\s/g, ''));
            //get the category
            var raw_grade_category;
            try {
                raw_grade_category = graded_rows[index].getElementsByClassName("itemCat")[0].textContent;
            } catch (error) {
                raw_grade_category = "other";
            }
            raw_grades.push({ category: raw_grade_category, achieved: raw_grade.points_have, possible: raw_grade.points_possible });
        }

        else if (graded_rows[index].getElementsByClassName("tooltip")[0] != null) {
            if (graded_rows[index].getElementsByClassName("tooltip")[0].textContent != "Exempt") {
                if (rawGrade != null && !isNaN(parseFloat(rawGrade.textContent))) {

                    // get the raw grade
                    var raw_grade = getGradeObject(rawGrade.textContent.replace(/\s/g, ''));
                    //get the category
                    var raw_grade_category;
                    try {
                        raw_grade_category = graded_rows[index].getElementsByClassName("itemCat")[0].textContent;
                    } catch (error) {
                        raw_grade_category = "other";
                    }
                    raw_grades.push({ category: raw_grade_category, achieved: raw_grade.points_have, possible: raw_grade.points_possible });
                }
            }
        }
    }

    for (let index = 0; index < upcoming_rows.length; index++) {
        var raw_grade_category;
        try {
            raw_grade_category = upcoming_rows[index].getElementsByClassName("itemCat")[0].textContent;
        } catch (error) {
            raw_grade_category = "other";
        }
        raw_grades.push({ category: raw_grade_category, achieved: 100, possible: 100 });

    }

    for (let index = 0; index < submitted_rows.length; index++) {
        var raw_grade_category;
        try {
            raw_grade_category = submitted_rows[index].getElementsByClassName("itemCat")[0].textContent;
        } catch (error) {
            raw_grade_category = "other";
        }
        raw_grades.push({ category: raw_grade_category, achieved: 100, possible: 100 });

    }



    var addedGrades = 0.0;
    var addedTotals = 0.0;

    raw_grades.forEach(grade => {
        var category_weight;

        passed_in_weights.forEach(weight => {
            if (weight.category == grade.category) {
                category_weight = weight.value;
            }

        });


        var calculated_grade = category_weight * (grade.achieved / grade.possible);
        if (isNaN(calculated_grade)) {
            passed_in_weights.push({ category: "other", value: 1 });
            addedGrades += (calculated_grade);
            addedTotals += 1;
        }
        else {
            addedGrades += (calculated_grade);
            addedTotals += category_weight;
        }
    });



    final_grade = (addedGrades / addedTotals);

    return final_grade;
}

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

    //var grade_object = { points_have: total_points, points_possible: total_total };

    return (total_points / total_total);
}