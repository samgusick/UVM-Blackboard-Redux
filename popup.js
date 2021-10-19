// the array that stores all of the classes being used by the extension
var classes = [];
var tabs_open = 0;
var isLoggedIn = true;

chrome.storage.sync.get(['stored_classes'],
    function (stored_array_as_object) {
        if (stored_array_as_object.stored_classes == undefined || stored_array_as_object.stored_classes.length == 0) {
            loadAllClasses();
        }
        else {
            load();
        }
    });


// listens for any request to get grades, finds them and sends them back to the extension
chrome.runtime.onMessage.addListener(function (web_content) {
    
    // only do this if the message fron the content script is "content", which means it's a class 
    if (web_content.msg == "content") {
        // validate if the class is in the stored classes or not
        var inClass = false;

        for (let index = 0; index < classes.length; index++) {
            if (web_content.url == classes[index].url) {
                inClass = true;
            }

        }

        // if the class is already in the array
        if (inClass) {
            var existing_class_index;
            for (let index = 0; index < classes.length; index++) {
                if (classes[index].url.replace(/\s/g, '') == web_content.url.replace(/\s/g, '')) {
                    existing_class_index = index;
                }
            }
            // replace the object at the specified index with the new data in this class
            classes[existing_class_index] = web_content;
        }

        // if the class is not in the array
        else if (!inClass) {
            // push the class to the stored classes array
            classes.push(web_content);
            // refresh the data
        }


        chrome.tabs.remove(web_content.tab_id);
        save();
        create_html(classes);


    }

    else if (web_content.msg == "sendAll") {
        var url_array = web_content.URLlist;
        url_array.forEach(url => {
            var startIndex = url.indexOf("_");
            startIndex++;
            var letter = "";
            var class_id = "";
            while (letter != "_") {
                letter = url[startIndex];
                class_id += letter;
                startIndex++;
                letter = url[startIndex];
            }

            var finalURL = "https://bb.uvm.edu/webapps/bb-mygrades-bb_bb60/myGrades?course_id=" + class_id + "_1&stream_name=mygrades&is_stream=false";
            add_new_class(finalURL);
        });

        chrome.tabs.remove(web_content.tab_id);

    }

    else if (web_content.msg == "notLoggedIn") {
        
        var error_message = document.createElement("h1");
        error_message.setAttribute("class", "error_message");
        error_message.appendChild(document.createTextNode("Login to BB First!"));
        document.getElementById("grade_table_body").appendChild(error_message);

        if (isLoggedIn)
        {
            var error_message = document.createElement("h1");
            error_message.appendChild(document.createTextNode("Please Wait..."));
            chrome.tabs.create({active: true, url: "https://bb.uvm.edu/"});
            isLoggedIn = false;
        }
        chrome.tabs.remove(web_content.id);
        return;
    }


    else if (web_content.msg == "nonExistentClass") {
        chrome.tabs.remove(web_content.id);
    }
});

// adds a new class by URL
function add_new_class(url_to_add) {
    chrome.tabs.create({ active: false, url: url_to_add }, function (tab) {
        chrome.tabs.executeScript(tab.id, { file: "content.js" }, function () {
            tabs_open++;
            chrome.tabs.sendMessage(tab.id, { weight: [], tab_id: tab.id, url: url_to_add, msg: "get" });
        });
    });
}

// saves the classes to chrome storage
function save() {
    // store the classes array


    chrome.storage.sync.set({ stored_classes: classes });
}

// loads the classes from chrome storage
function load() {

    // get the classes array
    chrome.storage.sync.get(['stored_classes'],
        function (stored_array_as_object) {
            //  get the classes from the stored_classes, old info will be replaced
            classes = [];
            classes = stored_array_as_object.stored_classes;
            // go through all of the stored classes, update their info

            var last_index_seen;
            var hasDuplicates = false;
            for (let index = 0; index < classes.length; index++) {
                var name_count = 0;
                for (let sub_index = 0; sub_index < classes.length; sub_index++) {
                    if (classes[index].name == classes[sub_index].name) {
                        name_count++;
                        last_index_seen = sub_index;
                        if (name_count > 1) {
                            hasDuplicates = true;
                        }
                    }
                }
            }
            if (hasDuplicates) {
                classes.splice(last_index_seen, 1);
            }

            classes = classes.filter(function (el) {
                return el != null;
            });

            for (let index = 0; index < classes.length; index++) {
                // create a tab with the given classes url
                chrome.tabs.create({ active: false, url: classes[index].url }, function (tab) {
                    // send the message to get the info sent back to popup.js

                    chrome.tabs.executeScript(tab.id, { file: "content.js" }, function () {
                        //tabs_open++;
                        chrome.tabs.sendMessage(tab.id, { weight: classes[index].weights, tab_id: tab.id, url: stored_array_as_object.stored_classes[index].url, msg: "get" });
                    });
                });
            }
        });
}


function loadAllClasses() {
    chrome.tabs.create({ active: false, url: "https://bb.uvm.edu/" }, function (tab) {
        // send the message to get the info sent back to popup.js

        var warning_text = document.getElementsByTagName("body")[0].appendChild(document.createElement("h1"));
        warning_text.style.fontSize = "large";
        warning_text.appendChild(document.createTextNode("First time loading classes you may need to hit refresh"));
        chrome.tabs.executeScript(tab.id, { file: "content.js" }, function () {
            //tabs_open++;

            chrome.tabs.sendMessage(tab.id, { msg: "getAll", tab_id: tab.id });
        });
    });
}

function create_html(classes_array) {

    // clear the table
    var table_body;
    table_body = document.getElementById("grade_table_body");
    table_body.innerHTML = '';


    // set up the basic table
    var number_grade_column_text = document.createElement("h1").appendChild(document.createTextNode("Number Grade"));
    var letter_grade_column_text = document.createElement("h1").appendChild(document.createTextNode("Letter Grade"));
    var name_column_text = document.createElement("h1").appendChild(document.createTextNode("Class Name"));
    var delete_column_text = document.createElement("h1").appendChild(document.createTextNode("Delete Class"));
    var category_column_text = document.createElement("h1").appendChild(document.createTextNode("Weights (Find in Class Syllabus)"));
    var header_row = document.createElement("tr");
    var delete_column = document.createElement("th");
    var name_column = document.createElement("th");

    var number_grade_column = document.createElement("th");
    var letter_grade_column = document.createElement("th");

    var category_column = document.createElement("th");
    category_column.setAttribute("class", "weight_block");
    name_column.appendChild(name_column_text);

    number_grade_column.appendChild(number_grade_column_text);
    letter_grade_column.appendChild(letter_grade_column_text);

    delete_column.appendChild(delete_column_text);
    category_column.appendChild(category_column_text);

    header_row.appendChild(delete_column);
    header_row.appendChild(name_column);
    header_row.appendChild(number_grade_column);
    header_row.appendChild(letter_grade_column);
    header_row.appendChild(category_column);
    table_body.appendChild(header_row);

    for (let index = 0; index < classes_array.length; index++) {
        var new_row = document.createElement("tr");
        new_row.setAttribute("id", classes_array[index].name);

        var new_delete = document.createElement("td");
        var new_name = document.createElement("td");
        var new_number_grade = document.createElement("td");
        var new_letter_grade = document.createElement("td");
        var new_category = document.createElement("td");
        var deleteButton = document.createElement("button");

        // setup the categories
        new_category.appendChild(document.createElement("table").appendChild(document.createElement("tbody")));

        classes_array[index].weights.forEach(element => {

            var category_text = document.createElement("td").appendChild(document.createTextNode(element.category + " %"));
            var category_value = document.createElement("input");
            category_value.setAttribute("type", "number");
            category_value.setAttribute("value", element.value * 100);
            category_value.setAttribute("id", element.category + classes_array[index].name);
            category_value.addEventListener("change", function (new_value) {
                category_value.setAttribute("value", document.getElementById(element.category + classes_array[index].name).value);
            });


            cat_row = document.createElement("tr");
            cat_row.appendChild(category_text);
            cat_row.appendChild(document.createElement("td").appendChild(category_value));

            new_category.appendChild(cat_row);

        });

        new_category.setAttribute("class", "weight_block");
        //new_category.setAttribute("hidden", false);

        // setup the delete button
        deleteButton.setAttribute("id", classes_array[index].name + "button");
        deleteButton.setAttribute("class", "delete-class-button");
        deleteButton.appendChild(document.createTextNode("Delete"));
        deleteButton.addEventListener('click', function () {
            document.getElementById(classes_array[index].name).innerHTML = '';
            classes.splice(index, 1);
            classes = classes.filter(function (el) {
                return el != null;
            });
            save();
        });

        new_delete.appendChild(deleteButton);

        new_name.appendChild(document.createTextNode(classes_array[index].name));

        real_grade = (100 * parseFloat(classes_array[index].grade)).toFixed(2);


        if (real_grade == "NaN") {
            new_number_grade.appendChild(document.createTextNode("N/A"));
        }
        else {
            new_number_grade.appendChild(document.createTextNode((real_grade + "%")));
        }

        new_letter_grade.appendChild(document.createTextNode(get_letter_grade(real_grade)));


        new_row.appendChild(new_delete);
        new_row.appendChild(new_name);
        new_row.appendChild(new_number_grade);
        new_row.appendChild(new_letter_grade);
        new_row.appendChild(new_category);

        table_body.appendChild(new_row);
    }

    table_body.setAttribute("id", "grade_table_body");

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

//give buttons functionality
document.getElementById("clear_storage_button").addEventListener('click', function () {
    chrome.storage.sync.clear();
    chrome.storage.local.clear();
    classes = [];
    var table_body;
    table_body = document.getElementById("grade_table_body")
    table_body.innerHTML = '';
    save();
});

document.getElementById("save_weights").addEventListener('click', function () {
    for (let index = 0; index < classes.length; index++) {
        for (let index2 = 0; index2 < classes[index].weights.length; index2++) {
            var new_weight = document.getElementById(classes[index].weights[index2].category + classes[index].name).getAttribute("value");
            classes[index].weights[index2].value = parseFloat(new_weight) / 100;
        }

    }

    save();
    load();
});

document.getElementById("refresh_button").addEventListener('click', function () {
    load();
});

document.getElementById("report_bug").addEventListener('click', function () {
    chrome.tabs.create({ active: true, url: "https://docs.google.com/forms/d/e/1FAIpQLSfYYhPe83ALiIcTBFPS5Hh5QOiQXjaHliNEIXmKEy0nqCZzmQ/viewform?usp=sf_link" });
});