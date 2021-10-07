
var newClasses = [];
var gradePageLinks = [];
var currentURLindex = 0;
var cloudArray;

//   give buttons functionality
document.getElementById("clear_storage_button").addEventListener('click', function () {
    chrome.storage.sync.clear();
    newClasses = [];
    var table_body;
    table_body = document.getElementById("grade_table_body")
    table_body.innerHTML = '';
});

document.getElementById("refresh_button").addEventListener('click', function () {
    var table_body;
    table_body = document.getElementById("grade_table_body")
    table_body.innerHTML = '';
    newClasses = [];
    gradePageLinks = [];
    cloudArray = undefined;
    var progressBar = document.getElementById("progress");
    progressBar.setAttribute("hidden", false);
    progressBar.setAttribute("style", "height:36px;width:0%;background-color:#4CAF50!important;text-align:center!important;font-size:20px;");
    progressBar.innerText = "0%";
    load();
});


load();
// go to the tab with the class links
function load() {

    var table_body;
    table_body = document.getElementById("grade_table_body")
    table_body.innerHTML = '';
    chrome.tabs.create({ active: false, url: "https://bb.uvm.edu/" });
}

chrome.runtime.onMessage.addListener(function (msgFromContent, sender) {
    if (msgFromContent.msg == "notLoggedIn") {
        chrome.tabs.remove(sender.tab.id);
        document.getElementById("warning").innerText = "login to Blackboard First!";
    }
    // #1 Get the list of class links 
    else if (msgFromContent.msg == "urlList") {
        chrome.tabs.remove(sender.tab.id);
        // store the grade page links
        gradePageLinks = msgFromContent.urlList;

        //console.log("recieved urls");
        // add a special element to indicate the end
        gradePageLinks.push("*");
        //console.log(gradePageLinks);

        chrome.tabs.create({ active: false, url: gradePageLinks[currentURLindex] });
    }

    else if (msgFromContent.msg == "gradeData") {
        chrome.tabs.remove(sender.tab.id);
        classTemp = translateGradeData(msgFromContent.categories, msgFromContent.unweighted_grades, msgFromContent.name)
        // add the new class data
        newClasses.push(classTemp);
        currentURLindex++;

        var completion = 100 * (currentURLindex / (gradePageLinks.length - 1)).toFixed(2);
        console.log(completion);
        var styling = "height:36px;width:" + completion + "%;background-color:#4CAF50!important;text-align:center!important;font-size:20px;";
        console.log(styling);
        document.getElementById("progress").setAttribute("style", styling);
        document.getElementById("progress").innerText = completion + "%";
        if (currentURLindex < gradePageLinks.length - 1) {
            chrome.tabs.create({ active: false, url: gradePageLinks[currentURLindex] });
        }

        if (newClasses.length == gradePageLinks.length - 1) {
            getCloudWeights();
            currentURLindex = 0;
        }
    }
});

function getCloudWeights() {

    chrome.storage.sync.get(function (result) {
        cloudArray = result.classes;

        if (cloudArray == undefined) {
            chrome.storage.sync.clear();
            console.log("cloud array is undefined, creating a new array...");
            cloudArray = newClasses;
            chrome.storage.sync.set({ 'classes': cloudArray });
            create_html(cloudArray);
        } else {
            console.log("cloud array found, filling in stored weights...");
            // go through all of the scraped classes, 

            for (let classIndex = 0; classIndex < newClasses.length; classIndex++) {
                var cloudContainsClass = false;
                for (let cloudIndex = 0; cloudIndex < cloudArray.length; cloudIndex++) {

                    if (newClasses[classIndex].name == cloudArray[classIndex].name) {
                        cloudContainsClass = true;

                    }
                }
                if (!cloudContainsClass) {
                    //if there are any ones that are not in the cloud array, push them
                    cloudArray.push(newClasses[classIndex])
                }
            }


            // go through all of the cloud classses and the 

            for (let classIndex = 0; classIndex < newClasses.length; classIndex++) {
                for (let classWeightIndex = 0; classWeightIndex < newClasses[classIndex].cats.length; classWeightIndex++) {
                    for (let index = 0; index < cloudArray.length; index++) {
                        if (cloudArray[index].name == newClasses[classIndex].name) {
                            if (!cloudArray[index].cats.includes(newClasses[classIndex].cats[classWeightIndex])) {
                                cloudArray[index].cats.push(newClasses[classIndex].cats[classWeightIndex]);
                                cloudArray[index].weights.push(newClasses[classIndex].weights[classWeightIndex]);
                            }
                        }
                    }

                }

            }
            console.log(cloudArray);
            chrome.storage.sync.set({ 'classes': cloudArray });
            create_html(cloudArray);
        }
    });
}

function translateGradeData(cats, grades, name) {
    var weightsArray = [];

    for (let index = 0; index < cats.length; index++) {
        weightsArray.push(0);

    }

    for (let index = 0; index < cats.length; index++) {
        weightsArray[index] = (1 / cats.length).toFixed(2);

    }

    var classData = {
        name: name,
        cats: cats,
        grades: grades,
        weights: weightsArray
    }

    return classData;
}

function create_html(classData) {

    // clear the table
    var table_body;
    table_body = document.getElementById("grade_table_body");
    table_body.innerHTML = '';


    // set up the basic table
    var number_grade_column_text = document.createElement("h1").appendChild(document.createTextNode("Number Grade"));
    var letter_grade_column_text = document.createElement("h1").appendChild(document.createTextNode("Letter Grade"));
    var name_column_text = document.createElement("h1").appendChild(document.createTextNode("Class Name"));
    var category_column_text = document.createElement("h1").appendChild(document.createTextNode("Weights (Find in Class Syllabus)"));
    var header_row = document.createElement("tr");
    var name_column = document.createElement("th");

    var number_grade_column = document.createElement("th");
    var letter_grade_column = document.createElement("th");

    var category_column = document.createElement("th");
    category_column.setAttribute("class", "weight_block");
    name_column.appendChild(name_column_text);

    number_grade_column.appendChild(number_grade_column_text);
    letter_grade_column.appendChild(letter_grade_column_text);


    category_column.appendChild(category_column_text);


    header_row.appendChild(name_column);
    header_row.appendChild(number_grade_column);
    header_row.appendChild(letter_grade_column);
    header_row.appendChild(category_column);
    table_body.appendChild(header_row);

    for (let index = 0; index < classData.length; index++) {
        var new_row = document.createElement("tr");
        new_row.setAttribute("id", classData[index].name);
        var new_name = document.createElement("td");
        var new_number_grade = document.createElement("td");
        var new_letter_grade = document.createElement("td");
        var new_category = document.createElement("td");

        // setup the categories
        new_category.appendChild(document.createElement("table").appendChild(document.createElement("tbody")));

        for (let index2 = 0; index2 < classData[index].weights.length; index2++) {
            var category_text = document.createElement("td").appendChild(document.createTextNode(classData[index].cats[index2] + " %"));
            var category_value = document.createElement("input");
            category_value.setAttribute("type", "number");
            category_value.setAttribute("value", classData[index].weights[index2] * 100);
            category_value.setAttribute("id", classData[index].name + classData[index].cats[index2]);
            category_value.addEventListener("change", function (new_value) {

                var value = document.getElementById(classData[index].name + classData[index].cats[index2]).value;
                var name = newClasses[index].name
                var category = newClasses[index].cats[index2];
                value = (value / 100).toFixed(2);

                console.log(name);
                console.log(category);

                chrome.storage.sync.get(function (result) {
                    cloudArray = result.classes;
                    for (let index = 0; index < cloudArray.length; index++) {
                        for (let index2 = 0; index2 < cloudArray[index].weights.length; index2++) {
                            if (cloudArray[index].name == name && cloudArray[index].cats[index2] == category) {
                                console.log("matching category found");
                                cloudArray[index].weights[index2] = value;
                            }
                        }
                    }

                    chrome.storage.sync.set({ 'classes': cloudArray });

                });

                chrome.storage.sync.get(function (result) {
                    console.log(result.classes);
                });


                //console.log(getObj);
                //category_value.setAttribute("value", document.getElementById(element.category + classData[index].name).getAttribute("value"));
            });


            cat_row = document.createElement("tr");
            cat_row.appendChild(category_text);
            cat_row.appendChild(document.createElement("td").appendChild(category_value));

            new_category.appendChild(cat_row);
        }

        new_category.setAttribute("class", "weight_block");
        //new_category.setAttribute("hidden", false);


        new_name.appendChild(document.createTextNode(classData[index].name));

        real_grade = 0;

        for (let index2 = 0; index2 < classData[index].weights.length; index2++) {
            real_grade += 100 * classData[index].weights[index2] * classData[index].grades[index2];
        }
        real_grade = real_grade.toFixed(2);


        if (real_grade == "NaN") {
            new_number_grade.appendChild(document.createTextNode("N/A"));
        }
        else {
            new_number_grade.appendChild(document.createTextNode((real_grade + "%")));
        }

        new_letter_grade.appendChild(document.createTextNode(get_letter_grade(real_grade)));


        new_row.appendChild(new_name);
        new_row.appendChild(new_number_grade);
        new_row.appendChild(new_letter_grade);
        new_row.appendChild(new_category);

        table_body.appendChild(new_row);
    }

    table_body.setAttribute("id", "grade_table_body");

    document.getElementById("progress").setAttribute("hidden", true);


}



function get_letter_grade(number_grade) {

    letter_grade = "";

    switch (true) {
        case number_grade == NaN:
            break;

        case number_grade == null:
            break;

        case number_grade == undefined:
            break;

        case ((number_grade < 60) == true):
            letter_grade = "F";
            break;


        case ((number_grade >= 60 && number_grade < 64) == true):
            letter_grade = "D-";
            break;

        case ((number_grade >= 64 && number_grade < 67) == true):
            letter_grade = "D";
            break;

        case ((number_grade >= 67 && number_grade < 70) == true):
            letter_grade = "D+";
            break;

        case ((number_grade >= 70 && number_grade < 74) == true):
            letter_grade = "C-";
            break;

        case ((number_grade >= 74 && number_grade < 77) == true):
            letter_grade = "C";
            break;

        case ((number_grade >= 77 && number_grade < 80) == true):
            letter_grade = "C+";
            break;

        case ((number_grade >= 80 && number_grade < 84) == true):
            letter_grade = "B-";
            break;

        case ((number_grade >= 84 && number_grade < 87) == true):
            letter_grade = "B";
            break;

        case ((number_grade >= 87 && number_grade < 90) == true):
            letter_grade = "B+";
            break;

        case ((number_grade >= 90 && number_grade < 94) == true):
            letter_grade = "A-";
            break;

        case ((number_grade >= 94 && number_grade < 97) == true):
            letter_grade = "A";
            break;

        case ((number_grade >= 97) == true):
            letter_grade = "A+";
            break;

    }

    return letter_grade;
}

