const container = document.getElementById("subjects");

function addSubject(name = "", grade = "", coef = "") {
  const div = document.createElement("div");
  div.className = "subject";

  div.innerHTML = `
    <input type="text" placeholder="المادة" value="${name}">
    <input type="number" placeholder="النقطة" value="${grade}" class="grade">
    <input type="number" placeholder="المعامل" value="${coef}" class="coef">
    <button onclick="this.parentElement.remove()">❌</button>
  `;

  container.appendChild(div);
}

function calculate() {
  const grades = document.querySelectorAll(".grade");
  const coefs = document.querySelectorAll(".coef");

  let total = 0;
  let coefSum = 0;

  for (let i = 0; i < grades.length; i++) {
    let g = parseFloat(grades[i].value);
    let c = parseFloat(coefs[i].value);

    if (!isNaN(g) && !isNaN(c)) {
      total += g * c;
      coefSum += c;
    }
  }

  let avg = coefSum ? (total / coefSum).toFixed(2) : "--";

  document.getElementById("result").innerText = "المعدل: " + avg;
}

function saveData() {
  const subjects = [];
  const rows = document.querySelectorAll(".subject");

  rows.forEach(row => {
    const inputs = row.querySelectorAll("input");
    subjects.push({
      name: inputs[0].value,
      grade: inputs[1].value,
      coef: inputs[2].value
    });
  });

  localStorage.setItem("bacData", JSON.stringify(subjects));
  alert("تم الحفظ ✅");
}

function loadData() {
  container.innerHTML = "";
  const data = JSON.parse(localStorage.getItem("bacData")) || [];

  data.forEach(s => {
    addSubject(s.name, s.grade, s.coef);
  });
}

window.onload = () => {
  addSubject();
};