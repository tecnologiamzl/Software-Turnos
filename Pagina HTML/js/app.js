document.addEventListener("DOMContentLoaded", () => {
  console.log(
    "app.js cargado correctamente. Ruta actual:",
    window.location.pathname
  );

  const API_BASE_URL = "http://179.50.98.2:9565";

  // --- LÓGICA DE AUTENTICACIÓN ---
  function checkAuth() {
    const user = localStorage.getItem("user");
    const isLoginPage =
      window.location.pathname.endsWith("/") ||
      window.location.pathname.endsWith("/index.html");
    if (!user && !isLoginPage) {
      window.location.href = "../index.html";
    }
  }
  checkAuth();

  // --- FUNCIÓN GLOBAL PARA MOSTRAR NOTIFICACIONES ---
  function showNotification(message, type = "success") {
    const container = document.getElementById("notification-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "success" ? "✓" : "!";
    toast.innerHTML = `<span>${icon}</span> <span class="toast-message">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }

  // --- LÓGICA PARA LA PÁGINA DE LOGIN (CORREGIDA) ---
  if (document.getElementById("login-form")) {
    const loginForm = document.getElementById("login-form");
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const usuarioInput = document.getElementById("usuario");
      const passwordInput = document.getElementById("password");
      const errorMsg = document.getElementById("error-message");
      const loginBtn = document.getElementById("login-button");
      loginBtn.disabled = true;
      loginBtn.textContent = "Ingresando...";
      errorMsg.textContent = "";
      try {
        const response = await fetch(`${API_BASE_URL}/LoginSFT`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usuario: usuarioInput.value,
            contrasena: passwordInput.value,
          }),
        });
        if (response.ok) {
          const userData = await response.json();
          const userAreas = userData.Areas || []; // Guardamos el array completo

          const userToStore = {
            nombre: userData.nombre || usuarioInput.value,
            areas: userAreas, // Se guarda como "areas" (plural)
          };
          localStorage.setItem("user", JSON.stringify(userToStore));
          window.location.href = "pages/inicio.html";
        } else {
          const errorText = await response.text();
          try {
            const errorData = JSON.parse(errorText);
            errorMsg.textContent =
              errorData.message || "Usuario o contraseña incorrectos.";
          } catch (parseError) {
            errorMsg.textContent = errorText;
          }
        }
      } catch (error) {
        console.error("Error en el login:", error);
        errorMsg.textContent = "Error de conexión. Verifique la red.";
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "Ingresar";
      }
    });
  }

  // --- LÓGICA PARA LA PÁGINA DE INICIO ---
  if (window.location.pathname.endsWith("/inicio.html")) {
    const welcomeMessage = document.getElementById("welcome-message");
    const logoutButton = document.getElementById("logout-button");
    const reporteBtn = document.getElementById("reporte-btn");
    const reporteModal = document.getElementById("reporte-modal");
    const closeReporteModalBtn = document.getElementById(
      "close-reporte-modal-btn"
    );
    const refreshReporteBtn = document.getElementById("refresh-reporte-btn"); // Nuevo botón

    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      welcomeMessage.textContent = `Bienvenid@, ${user.nombre}`;
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", () => {
        localStorage.removeItem("user");
        window.location.href = "../index.html";
      });
    }

    // --- FUNCIÓN REUTILIZABLE PARA ACTUALIZAR EL REPORTE ---
    function refreshReportIframe() {
      const iframe = reporteModal.querySelector("iframe");
      if (iframe) {
        iframe.src = iframe.src;
      }
    }

    // Abrir el modal
    if (reporteBtn) {
      reporteBtn.addEventListener("click", (e) => {
        e.preventDefault();
        refreshReportIframe(); // Actualizar automáticamente al abrir
        reporteModal.style.display = "flex";
      });
    }

    // Botón de actualización manual
    if (refreshReporteBtn) {
      refreshReporteBtn.addEventListener("click", () => {
        refreshReportIframe();
        // Añadir feedback visual con la animación
        refreshReporteBtn.classList.add("spinning");
        // Quitar la clase después de que la animación termine
        setTimeout(() => {
          refreshReporteBtn.classList.remove("spinning");
        }, 500);
      });
    }

    // Cerrar el modal
    if (closeReporteModalBtn) {
      closeReporteModalBtn.addEventListener("click", () => {
        reporteModal.style.display = "none";
      });
    }
    if (reporteModal) {
      reporteModal.addEventListener("click", (e) => {
        if (e.target === reporteModal) {
          reporteModal.style.display = "none";
        }
      });
    }
  }

  // --- LÓGICA COMPLETA PARA LA PÁGINA DE ASIGNACIÓN ---
  if (window.location.pathname.endsWith("/asignacion.html")) {
    console.log("Ejecutando lógica para asignacion.html...");

    const areasContainer = document.getElementById("gallery-areas");
    const namesContainer = document.getElementById("gallery-names");
    const gestionTurnosBtn = document.querySelector(".btn-gestion");
    const generateButton = document.getElementById("btn-generar");
    const modal = document.getElementById("gestion-modal");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const semanaSelector = document.getElementById("semana-selector");
    const matrizBody = document.getElementById("matriz-body");
    const guardarCambiosBtn = document.getElementById("guardar-cambios-btn");
    let allData = [],
      selectedArea = null,
      fullScheduleData = [],
      changesToSave = {},
      filteredPeople = [];

    // CORRECCIÓN: Leer el array de áreas
    const loggedInUser = JSON.parse(localStorage.getItem("user"));
    const userAreas = loggedInUser ? loggedInUser.areas : []; // Leer "areas" (plural)
    const isAdmin = userAreas.includes("Admin"); // Comprueba si 'Admin' está en el array
    console.log(
      `Usuario: ${loggedInUser?.nombre}, Áreas: [${userAreas.join(
        ", "
      )}], Es Admin: ${isAdmin}`
    );

    const shiftOptions = [
      "",
      "Turno Día",
      "Turno Noche",
      "Descanso",
      "Vacaciones",
      "Suspension",
      "Capacitación",
      "Calamidad",
      "Incapacidad",
    ];
    const diasSemana = [
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
      "domingo",
    ];

    // AÑADE ESTA FUNCIÓN
    function getWeekNumber(d) {
      d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      var weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
      return weekNo;
    }

    function renderNames() {
      if (!selectedArea) {
        namesContainer.innerHTML =
          "<p>Seleccione un área para ver el personal.</p>";
        filteredPeople = []; // CORRECCIÓN 1: Asegurarse de limpiar la lista de personas
        return;
      }
      filteredPeople = allData.filter((p) => p.area === selectedArea);
      namesContainer.innerHTML = "";
      if (filteredPeople.length > 0) {
        filteredPeople.forEach((person) => {
          const div = document.createElement("div");
          div.className = "person-item";
          div.textContent = `${person.nombre} ${person.apellidos}`;
          namesContainer.appendChild(div);
        });
      } else {
        namesContainer.innerHTML = "<p>No hay personal en esta área.</p>";
      }
    }

    function renderAreas() {
      const uniqueAreasFromData = [
        ...new Set(allData.map((item) => item.area)),
      ].sort();
      let areasToDisplay = isAdmin ? uniqueAreasFromData : uniqueAreasFromData.filter(area => userAreas.includes(area));
      areasToDisplay.forEach((area) => {
        const button = document.createElement("button");
        button.className = "area-item";
        button.textContent = area;
        button.addEventListener("click", () => {
          selectedArea = area;
          document
            .querySelectorAll(".area-item.selected")
            .forEach((b) => b.classList.remove("selected"));
          button.classList.add("selected");
          renderNames();
        });
        areasContainer.appendChild(button);
      });
      if (areasContainer.querySelector(".area-item")) {
        areasContainer.querySelector(".area-item").click();
      } else if (!isAdmin) {
        areasContainer.innerHTML =
          "<p>No tienes áreas asignadas con personal activo.</p>";
      }
    }

    async function fetchDataForGalleries() {
      console.log("Cargando datos para las galerías...");
      try {
        const response = await fetch(`${API_BASE_URL}/On_Off_Bording_Get`, {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const responseData = await response.json();

        let allPeople = Object.values(responseData);
        allData = allPeople.filter((person) => person.estado === "Activo");

        console.log(
          `Se encontraron ${allPeople.length} registros, se filtraron ${allData.length} activos.`
        );
        renderAreas();
      } catch (error) {
        console.error("Error en fetchDataForGalleries:", error);
        areasContainer.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
      }
    }

    function getShiftClass(shift) {
      const classes = {
        "Turno Día": "turno-dia",
        "Turno Noche": "turno-noche",
        Descanso: "descanso",
        Vacaciones: "vacaciones",
        Suspension: "suspension",
        Capacitación: "capacitacion",
        Calamidad: "calamidad",
        Incapacidad: "incapacidad",
      };
      return classes[shift] || "vacio";
    }

    function flattenScheduleData(data) {
      const flatData = [];
      (data || []).forEach((record) => {
        if (!record.registros) return;
        (record.registros || []).forEach((registro, index) => {
          if (!registro.semanas) return;
          Object.keys(registro.semanas).forEach((semanaKey) => {
            (registro.semanas[semanaKey] || []).forEach((diaData) => {
              diasSemana.forEach((diaNombre) => {
                if (diaData && diaData[diaNombre] !== undefined) {
                  flatData.push({
                    PosicionOriginal: index + 1,
                    cc: registro.cc,
                    nombres: registro.nombres,
                    area: registro.area,
                    bloque: registro.bloque,
                    Semana: semanaKey,
                    DiaNombre: diaNombre,
                    TipoTurno: diaData[diaNombre],
                    fecha: diaData.fecha,
                    OrdenMatriz: `${String(index + 1).padStart(4, "0")} - ${
                      registro.nombres
                    } - ${registro.bloque}`,
                  });
                }
              });
            });
          });
        });
      });
      return flatData;
    }

    function populateSemanaSelector() {
      const semanas = [
        ...new Set(fullScheduleData.map((d) => d.Semana)),
      ].sort();
      semanaSelector.innerHTML = "";
      semanas.forEach((semana) => {
        const option = document.createElement("option");
        option.value = semana;
        option.textContent = semana;
        semanaSelector.appendChild(option);
      });
    }

    function renderMatriz(selectedWeek) {
      matrizBody.innerHTML = "";
      changesToSave = {};
      const dataForWeek = fullScheduleData.filter(
        (d) => d.Semana === selectedWeek
      );

       // --- NUEVA LÓGICA PARA EL HEADER DINÁMICO ---
            const headerRow = document.getElementById('matriz-header-row');
            if (headerRow) {
                // 1. Crear un mapa de fechas para la semana seleccionada
                const datesMap = {};
                dataForWeek.forEach(item => {
                    if (!datesMap[item.DiaNombre]) {
                        // Guardamos la fecha en formato DD/MM
                        const dateParts = item.fecha.split('/');
                        datesMap[item.DiaNombre] = `${dateParts[0]}/${dateParts[1]}`;
                    }
                });

                // 2. Limpiar el header actual (dejando solo "Empleado")
                headerRow.innerHTML = '<th>Empleado</th>';

                // 3. Construir y añadir los nuevos headers de día con fecha
                diasSemana.forEach(dia => {
                    const th = document.createElement('th');
                    const date = datesMap[dia] || ''; // Obtener la fecha o dejar en blanco si no existe
                    const diaCapitalized = dia.charAt(0).toUpperCase() + dia.slice(1);
                    
                    // Usamos <br> para separar y <span> para estilizar la fecha
                    th.innerHTML = `${diaCapitalized}<br><span class="header-date">${date}</span>`;
                    headerRow.appendChild(th);
                });
            }
            // --- FIN DE LA NUEVA LÓGICA ---

      const empleados = {};
      dataForWeek.forEach((d) => {
        if (!empleados[d.OrdenMatriz]) {
          empleados[d.OrdenMatriz] = { cc: d.cc, turnos: {} };
        }
        empleados[d.OrdenMatriz].turnos[d.DiaNombre] = d.TipoTurno;
      });

      const sortedEmpleados = Object.keys(empleados).sort();
      if (sortedEmpleados.length === 0) {
        matrizBody.innerHTML = `<tr><td colspan="8" class="loading-state">No hay programación para esta selección.</td></tr>`;
        return;
      }

      sortedEmpleados.forEach((nombreEmpleado) => {
        const tr = document.createElement("tr");
        const tdNombre = document.createElement("td");
        tdNombre.textContent = nombreEmpleado;
        tr.appendChild(tdNombre);

        diasSemana.forEach((dia) => {
          const tdDia = document.createElement("td");
          const turnoActual = empleados[nombreEmpleado].turnos[dia] || "";
          tdDia.className = getShiftClass(turnoActual);

          const select = document.createElement("select");
          select.className = "shift-select";

          shiftOptions.forEach((opcion) => {
            const option = document.createElement("option");
            option.value = opcion;
            option.textContent = opcion;
            if (opcion === turnoActual) option.selected = true;
            select.appendChild(option);
          });

          select.dataset.cc = empleados[nombreEmpleado].cc;
          select.dataset.dia = dia;
          select.dataset.semana = selectedWeek;
          select.addEventListener("change", (e) => {
            const { cc, semana, dia } = e.target.dataset;
            const nuevoTurno = e.target.value;
            const key = `${cc}-${semana}-${dia}`;
            changesToSave[key] = nuevoTurno;
            // CORRECCIÓN IMPORTANTE: El target es el <select>, su padre es el <div>, el padre del div es la celda <td>
            e.target.parentElement.parentElement.className =
              getShiftClass(nuevoTurno);
          });

          const selectWrapper = document.createElement("div");
          selectWrapper.className = "select-wrapper";
          selectWrapper.appendChild(select);

          // CORRECCIÓN 2: Añadir solo el wrapper a la celda.
          tdDia.appendChild(selectWrapper);

          tr.appendChild(tdDia);
        });
        matrizBody.appendChild(tr);
      });
    }

    // fetchDataForModal ahora debe ser más flexible para el admin
    async function fetchDataForModal() {
      matrizBody.innerHTML = `<tr><td colspan="8" class="loading-state">Cargando programación...</td></tr>`;
      if (isAdmin && !selectedArea) {
        matrizBody.innerHTML = `<tr><td colspan="8" class="loading-state">Administrador, por favor seleccione un área para gestionar.</td></tr>`;
        return;
      }

      try {
        const response = await fetch("http://179.50.98.2:9565/DatosMongoDB", {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        if (!response.ok) throw new Error(`Error de red: ${response.status}`);
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new TypeError(
            `La respuesta no es JSON. Se recibió: ${contentType}.`
          );
        }
        const rawData = await response.json();
        let allScheduleData = flattenScheduleData(Object.values(rawData));
        if (isAdmin) {
          fullScheduleData = allScheduleData.filter(
            (item) => item.area === selectedArea
          );
        } else {
          // CORRECCIÓN: Filtra el modal usando el array de áreas
          fullScheduleData = allScheduleData.filter((item) =>
            userAreas.includes(item.area)
          );
        }

        populateSemanaSelector();
        if (semanaSelector.value) {
          renderMatriz(semanaSelector.value);
        } else {
          matrizBody.innerHTML = `<tr><td colspan="8" class="loading-state">No se encontraron semanas para las áreas seleccionadas.</td></tr>`;
        }
      } catch (error) {
        console.error(error);
        matrizBody.innerHTML = `<tr><td colspan="8" class="loading-state" style="color:red;"><b>Error:</b> ${error.message}</td></tr>`;
      }
    }

    async function saveChanges() {
      if (Object.keys(changesToSave).length === 0) {
        showNotification("No se ha realizado ningún cambio.", "error");
        return;
      }
      const payload = Object.entries(changesToSave).map(([key, nuevoTurno]) => {
        const [cc, semana, dia] = key.split("-");
        return { cc, semana, dia, nuevoTurno };
      });
      guardarCambiosBtn.disabled = true;
      guardarCambiosBtn.textContent = "Guardando...";
      try {
        const response = await fetch(
          "http://179.50.98.2:9565/Cambio_Secuecnia",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "true",
            },
            body: JSON.stringify(payload),
          }
        );
        if (response.ok) {
          showNotification("¡Cambios guardados exitosamente!");
          changesToSave = {};
        } else {
          const errorText = await response.text();
          throw new Error(`Error al guardar: ${errorText}`);
        }
      } catch (error) {
        console.error(error);
        showNotification(error.message, "error");
      } finally {
        guardarCambiosBtn.disabled = false;
        guardarCambiosBtn.textContent = "Guardar Cambios";
      }
    }

    // === Asignación de Event Listeners ===
    gestionTurnosBtn.addEventListener("click", () => {
      modal.style.display = "flex";
      // --- LÓGICA AÑADIDA PARA MOSTRAR LA SEMANA ---
      const currentWeekDisplay = document.getElementById(
        "current-week-display"
      );
      if (currentWeekDisplay) {
        const weekNum = getWeekNumber(new Date());
        // Usamos <span> para estilizar el número por separado
        currentWeekDisplay.innerHTML = `Semana Actual: <span class="week-number">${weekNum}</span>`;
      }
      fetchDataForModal();
    });
    closeModalBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });
    semanaSelector.addEventListener("change", (e) => {
      renderMatriz(e.target.value);
    });
    guardarCambiosBtn.addEventListener("click", saveChanges);

    generateButton.addEventListener("click", async () => {
      if (filteredPeople.length === 0) {
        showNotification("Seleccione un área con personal.", "error");
        return;
      }
      generateButton.disabled = true;
      generateButton.textContent = "Generando...";
      const postUrl = "http://179.50.98.2:9565/calcularTurnos";
      try {
        const response = await fetch(postUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify(filteredPeople),
        });
        if (response.ok) {
          showNotification("¡Turnos generados exitosamente!");
        } else {
          const errorText = await response.text();
          throw new Error(
            `La API respondió con un error: ${response.status} - ${errorText}`
          );
        }
      } catch (error) {
        console.error("Error al generar turnos:", error);
        showNotification(
          `Hubo un problema al generar los turnos: ${error.message}`,
          "error"
        );
      } finally {
        generateButton.disabled = false;
        generateButton.textContent = "Generar Turnos";
      }
    });

    // === Iniciar Carga de Datos de la Página ===
    fetchDataForGalleries();
  }
});
