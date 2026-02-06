// DB College Result Portal - JavaScript
// This file handles form submission, CSV data fetching, and result display

// ===================================================
// IMPORTANT: SET YOUR GOOGLE SHEET CSV URL HERE
// ===================================================
// Steps to get your Google Sheet CSV URL:
// 1. Create a Google Sheet with these exact column headers in Row 1:
//    roll_no,student_name,standard,marathi,hindi,english,maths,science,total,result
// 2. Fill in your student data starting from Row 2
// 3. Click "File" → "Share" → "Publish to web"
// 4. Choose "Comma-separated values (.csv)" from the dropdown
// 5. Click "Publish"
// 6. Copy the provided link and replace the URL below:

const CSV_URL = "https://docs.google.com/spreadsheets/d/1Z3I8OzAkb627gxcg6BqCOHcr9X_d7YZeaGLXNK0UVjc/gviz/tq?tqx=out:csv";

// ===================================================
// DOM Elements
// ===================================================
const resultForm = document.getElementById('resultForm');
const standardSelect = document.getElementById('standardSelect');
const rollNumberInput = document.getElementById('rollNumber');
const checkResultBtn = document.getElementById('checkResult');
const resultSection = document.getElementById('resultSection');
const resultContent = document.getElementById('resultContent');
const errorMessage = document.getElementById('errorMessage');
const loading = document.getElementById('loading');
const printResultBtn = document.getElementById('printResult');

// ===================================================
// Event Listeners
// ===================================================

// Form submission handler
resultForm.addEventListener('submit', function(e) {
    e.preventDefault();
    checkResult();
});

// Print result button handler
printResultBtn.addEventListener('click', function() {
    window.print();
});

// ===================================================
// Main Function: Check Result
// ===================================================
async function checkResult() {
    // Get form values
    const standard = standardSelect.value;
    const rollNumber = rollNumberInput.value.trim();
    
    // Basic validation
    if (!standard || !rollNumber) {
        showError("Please select a class and enter your roll number.");
        return;
    }
    
    // Show loading and hide previous results/errors
    showLoading();
    hideResult();
    hideError();
    
    try {
        // Fetch CSV data from Google Sheets
        const csvData = await fetchCSVData();
        
        // Parse CSV data
        const students = parseCSV(csvData);
        
        // Find the student by roll number and standard
        const student = findStudent(students, rollNumber, standard);
        
        if (student) {
            // Display the result
            displayResult(student);
        } else {
            // Show error if student not found
            showError(`No result found for Roll Number: ${rollNumber} in ${standard} Standard. Please check your details and try again.`);
        }
    } catch (error) {
        console.error("Error fetching or processing data:", error);
        showError("Unable to fetch result data. Please check your internet connection and try again. If the problem persists, contact the college administration.");
    } finally {
        hideLoading();
    }
}

// ===================================================
// CSV Data Handling Functions
// ===================================================

// Fetch CSV data from Google Sheets
async function fetchCSVData() {
    try {
        const response = await fetch(CSV_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        throw new Error(`Failed to fetch data: ${error.message}`);
    }
}

// Parse CSV data into an array of student objects
function parseCSV(csvText) {
    const students = [];
    const lines = csvText.split('\n');
    
    // Check if we have at least a header row
    if (lines.length < 1) return students;
    
    // Extract headers (first row)
    const headers = lines[0]
        .split(',')
        .map(header => header.trim().toLowerCase().replace(/"/g, ''));
    
    // Process each data row
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;
        
        // Parse CSV row (handling quoted values)
        const row = parseCSVRow(line);
        
        // Create student object
        const student = {};
        headers.forEach((header, index) => {
            if (row[index] !== undefined) {
                // Clean the value: remove quotes, trim whitespace
                let value = row[index].replace(/"/g, '').trim();
                
                // Convert numeric fields to numbers
                if (['roll_no', 'marathi', 'hindi', 'english', 'maths', 'science', 'total'].includes(header)) {
                    value = Number(value) || 0;
                }
                
                // Standardize standard field (case-insensitive, remove spaces)
                if (header === 'standard') {
                    value = value.toLowerCase().replace(/\s+/g, '');
                }
                
                student[header] = value;
            }
        });
        
        // Only add if we have required fields
        if (student.roll_no && student.student_name) {
            students.push(student);
        }
    }
    
    return students;
}

// Parse a CSV row, handling quoted values with commas
function parseCSVRow(line) {
    const result = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            // Toggle quote state
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(currentValue);
            currentValue = '';
        } else {
            // Add character to current field
            currentValue += char;
        }
    }
    
    // Add the last field
    result.push(currentValue);
    
    return result;
}

// Find student by roll number and standard (case-insensitive, flexible matching)
function findStudent(students, rollNumber, standard) {
    // Standardize inputs for comparison
    const rollNoToFind = rollNumber.toString().trim();
    const standardToFind = standard.toLowerCase().replace(/\s+/g, '');
    
    return students.find(student => {
        // Handle roll_no as string or number
        const studentRollNo = student.roll_no.toString().trim();
        const studentStandard = student.standard ? student.standard.toString().toLowerCase().replace(/\s+/g, '') : '';
        
        // Compare both roll number and standard
        return studentRollNo === rollNoToFind && studentStandard === standardToFind;
    });
}

// ===================================================
// UI Display Functions
// ===================================================

// Display student result
function displayResult(student) {
    // Format standard for display
    const standardDisplay = formatStandard(student.standard);
    
    // Create result HTML
    const resultHTML = `
        <div class="student-info">
            <div class="info-item">
                <div class="info-label">Student Name</div>
                <div class="info-value">${escapeHTML(student.student_name)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Roll Number</div>
                <div class="info-value">${escapeHTML(student.roll_no)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Standard</div>
                <div class="info-value">${standardDisplay}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Result Status</div>
                <div class="info-value ${student.result.toLowerCase() === 'pass' ? 'pass' : 'fail'}">${escapeHTML(student.result)}</div>
            </div>
        </div>
        
        <div class="result-table-container">
            <table class="result-table">
                <thead>
                    <tr>
                        <th>Subject</th>
                        <th>Marks Obtained</th>
                        <th>Out Of</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${generateSubjectRows(student)}
                </tbody>
                <tfoot>
                    <tr>
                        <td><strong>Total</strong></td>
                        <td><strong>${student.total}</strong></td>
                        <td><strong>500</strong></td>
                        <td><strong class="${student.result.toLowerCase() === 'pass' ? 'pass' : 'fail'}">${escapeHTML(student.result)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        
        <div class="result-summary">
            <p><strong>Percentage:</strong> ${calculatePercentage(student.total)}%</p>
            <p><strong>Remarks:</strong> ${getRemarks(student.result, student.total)}</p>
        </div>
    `;
    
    // Update the result content
    resultContent.innerHTML = resultHTML;
    
    // Show the result section
    resultSection.style.display = 'block';
    
    // Scroll to result section
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Generate table rows for each subject
function generateSubjectRows(student) {
    const subjects = [
        { name: 'Marathi', marks: student.marathi || 0 },
        { name: 'Hindi', marks: student.hindi || 0 },
        { name: 'English', marks: student.english || 0 },
        { name: 'Mathematics', marks: student.maths || 0 },
        { name: 'Science', marks: student.science || 0 }
    ];
    
    return subjects.map(subject => {
        const status = subject.marks >= 35 ? 'Pass' : 'Fail';
        return `
            <tr>
                <td>${subject.name}</td>
                <td>${subject.marks}</td>
                <td>100</td>
                <td><span class="${status.toLowerCase()}">${status}</span></td>
            </tr>
        `;
    }).join('');
}

// Format standard for display (e.g., "5th" -> "5th Standard")
function formatStandard(standard) {
    if (!standard) return '';
    
    // Remove any non-alphanumeric characters and convert to lowercase
    const cleanStandard = standard.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Map to display format
    const standardMap = {
        '5th': '5th Standard',
        '6th': '6th Standard',
        '7th': '7th Standard',
        '8th': '8th Standard',
        '9th': '9th Standard',
        '10th': '10th Standard'
    };
    
    return standardMap[cleanStandard] || `${cleanStandard} Standard`;
}

// Calculate percentage
function calculatePercentage(total) {
    const maxMarks = 500; // 5 subjects * 100 marks each
    const percentage = (total / maxMarks) * 100;
    return percentage.toFixed(2);
}

// Get remarks based on result and total marks
function getRemarks(result, total) {
    if (result.toLowerCase() === 'fail') {
        return 'Needs improvement. Please contact your class teacher for guidance.';
    }
    
    const percentage = (total / 500) * 100;
    
    if (percentage >= 85) {
        return 'Outstanding performance! Keep up the excellent work.';
    } else if (percentage >= 75) {
        return 'Very good performance. Continue your hard work.';
    } else if (percentage >= 60) {
        return 'Good performance. There is room for improvement.';
    } else if (percentage >= 35) {
        return 'Satisfactory performance. Focus on improving your weak areas.';
    } else {
        return 'Passed. Need to work harder for better results.';
    }
}

// Show error message
function showError(message) {
    errorMessage.innerHTML = `
        <h4><i class="fas fa-exclamation-triangle"></i> Result Not Found</h4>
        <p>${escapeHTML(message)}</p>
        <p>Please verify your details and try again.</p>
    `;
    errorMessage.style.display = 'block';
    resultSection.style.display = 'block';
    
    // Scroll to error message
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Hide error message
function hideError() {
    errorMessage.style.display = 'none';
}

// Show loading indicator
function showLoading() {
    loading.style.display = 'flex';
    checkResultBtn.disabled = true;
    checkResultBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
}

// Hide loading indicator
function hideLoading() {
    loading.style.display = 'none';
    checkResultBtn.disabled = false;
    checkResultBtn.innerHTML = '<i class="fas fa-check-circle"></i> Check Result';
}

// Hide result content
function hideResult() {
    resultContent.innerHTML = '';
}

// Utility function to escape HTML (security)
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===================================================
// Initialize the application
// ===================================================
console.log("DB College Result Portal initialized successfully.");
console.log("To set up your own Google Sheet:");
console.log("1. Create a sheet with required columns");
console.log("2. Publish it to the web as CSV");
console.log("3. Update the CSV_URL variable in script.js");
