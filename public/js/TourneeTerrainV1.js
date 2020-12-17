let startTime = "2020-08-15T00:00:00.000Z";
let endTime = "2020-08-25T00:00:00.000Z";

$(function() {
  // Initialisation DatePicker
  $("#datepicker").datepicker({
    dateFormat: 'dd-mm-yy',
  });
  $("#start-time").flatpickr({
    enableTime: true,
    dateFormat: "Y-m-dTH:i:00.000",
    time_24hr: true
  });
  $("#end-time").flatpickr({
    enableTime: true,
    dateFormat: "Y-m-dTH:i:00.000",
    time_24hr: true
  });
  // Initialisation Google Charts
  google.charts.load('current', {
    packages: ['corechart'],
  });
  $('#set-time').on('click', function() {
    setTimeWindow();
  })
});

$(window).on('load', () => {
  // Requête pour récupérer les sites de production
  let siteRequest = {
    "url": "/api/sites",
    "method": "GET",
    "timeout": 0,
    "headers": {
      "username": "theo.guilhin",
    },
  };

  $.ajax(siteRequest).done(function(siteList) {
    // Requête sur les contextes
    let contextRequest = {
      "url": "/api/contextes",
      "method": "GET",
      "timeout": 0,
      "headers": {
        "username": "theo.guilhin",
      },
    };
    $.ajax(contextRequest).done(function(contextList) {
      // Création d'un menu déroulant pour chaque site
      $(".filters-container").append(
        '<select name="Site" id="site-select"><option value="">--Please choose an option--</option></select>'
      );
      for (i = 0; i < siteList.length; i++) {
        $("#site-select").append('<option value="' + siteList[i]._id + '">' + siteList[i].nom + '</option>');
      }
      // Ajout du bouton de déclenchement de la requête pour un site
      $(".filters-container").append(
        '<button id="report-request">Lancer la recherche</button>'
      );
      // Ajout du listener du bouton pour déclencher la récupération de l'auto-contrôle du site
      $('#report-request').on('click', function(event) {
        siteMainRequest($('#site-select').val(), contextList);
      });

    });
  });
});

// Fonction de récupérationde l'auto-contrôle du site correspondant au @siteId, avec en argument préalable la liste des contextes @contextList
function siteMainRequest(siteId, contextList) {
  // Requête pour récupération des pièces du site
  let partsRequest = {
    "url": "/api/pieces?q={ \"siteId\":{\"$eq\":\"" + siteId + "\"}}",
    "method": "GET",
    "timeout": 0,
    "headers": {
      "username": "theo.guilhin",
    },
  };

  $.ajax(partsRequest).done(function(partList) {
    // Vidage du div contenant le résultat de la requête
    $('#response-container').empty();
    // Appel d'une fonction de récupération des données de chaque pièce
    for (i = 0; i < partList.length; i++) {
      computePartReport(partList[i], contextList);
    }

  });
}

// Fonction de calcul du rapport de la pièce @part, avec en argument préalable la liste des contextes @contextList
function computePartReport(part, contextList) {

  // Variable contenant le nombre de mesures
  let measuresNb = 0;
  // Requête pour récupération des cotes de la pièce @part
  let partRequest = {
    "url": "/api/cotes?q={ \"pieceId\":{\"$eq\":\"" + part._id + "\"}}",
    "method": "GET",
    "timeout": 0,
    "headers": {
      "username": "theo.guilhin",
    },
  };

  let dimList = undefined;

  $.ajax(partRequest).done(function(dims) {

    dimList = dims;

    // Récupération de la plage horaire d'analyse
    let shiftInfo = getTimeWindow();

    // Récupération des mesures dans la plage horaire donnée (@shiftInfo)
    let measuresRequest = {
      "url": "/api/mesurehistoriques?q={\"$and\" : [{\"date\": { \"$gt\" : \"" + shiftInfo.start + "\"}},{\"date\": { \"$lt\" : \"" + shiftInfo.end + "\"}},{\"pieceId\": { \"$eq\" : \"" + part._id + "\"}}]}",
      "method": "GET",
      "timeout": 0,
      "headers": {
        "username": "theo.guilhin",
      }
    };
    $.ajax(measuresRequest).done(function(measures) {
      // measureCount contient des informations sur la liste des mesures
      /*
      {
        measureId1: {
          conformity: "Conformité de la mesure",
          context: "Id du contexte",
          contextName: "Nom du contexte",
          date: "date au format aaaa-mm-jjThh:mm:ss.mmsZ",
          measuresNb : "Nombre de cotes mesurées",
          measures: {
            0: {
              measure: {
                client: "cliendId",
                commentaire: "Commentaire lié à la mesure",
                contextId: "contextId",
                coteId: "coteId",
                date: "date au format aaaa-mm-jjThh:mm:ss.mmsZ",
                lotId: "lotId",
                machineId: "machineId",
                pieceId: "pieceId",
                pilotageId: "pilotageId",
                user_name: "username",
                _id: "id de la mesure",
                values: ["val1", "val2", ...]
              },
              measureConformity: "Conformité de la mesure"
            },
            1: {...}
          }
        },
        measureId2: {...},
        ...
      }
      */
      let measureCount = {};
      // contextCount stocke le nombre de mesures conformes ou non par contextes
      /*
      {
        contextId1: {
          contextName: "Nom du contexte",
          mesCount: "Nombre de mesures total dans le contexte",
          nokCount: "Nombre de mesures NOK",
          okCount: "Nombre de mesures OK",
          dateList: ["date de la mes 1", "date de la mes 2", ...]
        },
        contextId2: {...},
        ...
      }
      */
      let contextCount = {};
      // Contient la liste des mesures, rangées par cote
      /*
      {
        coteId1: {
          dim: {     (Objet dim de Ellistat)
            LSI: "limite de surveillance inférieure",
            LSS: "limite de surveillance supérieure",
            cible: "valeur cible",
            client: "MXtHBmixsyZJP9X",
            contexte_excluded: [Liste des contextes exclus A COMPLETER],
            cp: "valeur indiquée du CP",
            cp_calculated: "valeur indiquée du CP",
            date: "date au format 2020-11-19T16:00:58.280Z",
            isHiddenInSPC: "caché ou non dans le SPC",
            nom: "Nom de la cote",
            nombreMesure: "Nombre de mesures attendues",
            nominal: "Valeur du nominal",
            ordre: "pas compris",
            pieceId: "pieceId",
            pp_calculated: "Valeur calculée du pp",
            ppk_calculated: "Valeur calculée du ppk",
            tolerance: "valeur de l'étendue de la tolérance",
            tolerance_max: "valeur max de la tolérance",
            tolerance_min: "valeur min de la tolérance",
            userId: "Nom de l'utilisateur à la création ?",
            _id: "coteId1",
          },
          measures: {
            0: {
              client: "cliendId",
              commentaire: "Commentaire lié à la mesure",
              contextId: "contextId",
              coteId: "coteId",
              date: "date au format aaaa-mm-jjThh:mm:ss.mmsZ",
              lotId: "lotId",
              machineId: "machineId",
              pieceId: "pieceId",
              pilotageId: "pilotageId",
              user_name: "username",
              _id: "id de la mesure",
              values: ["val1", "val2", ...]
            },
            1: {...},
            ...
          }
        },
        coteId2: {...},
        ...
      }
      */
      let measuresByDim = {};
      // Nombre total de pilotages pour la pièce initialisé à zéro
      let totalMesCount = 0;

      // Boucle sur chaque mesure pour compléter les objets @measureCount, @contextCount, @measuresByDim, @totalMesCount
      $.each(measures, function(index, mes) {
        // Récupération de la conformité de la mesure via la fonction "getMeasureConformity"
        let mesConf = getMeasureConformity(mes, dimList);
        // Récupération du contexte de la mesure dans la liste via le @contextId de la mesure @mes
        let context = contextList.find(e => e._id == mes.contexteId);

        // Premier test pour vérifier si @measureCount contient déjà le pilotage en cours
        // S'il ne le contient pas
        if (!Object.keys(measureCount).includes(mes.pilotageId)) {
          // Ajout du pilotage sous la clé @pilotageId
          measureCount[mes.pilotageId] = {
            context: mes.contexteId, //ajout de l'id du contexte
            contextName: context.nom, //ajout du nom du contexte
            date: mes.date, // ajout de la date de mesure
            measuresNb: mes.values.length, // initialisation du nombre de cotes mesurées
            measures: [{
              measure: mes,
              measureConformity: mesConf
            }], // Ajout de la mesure et de sa conformité
          };
          // Si l'objet @contextCount n'a pas encore de mesure dans le contexte de la mesure actuelle
          if (!Object.keys(contextCount).includes(mes.contexteId)) {
            // Ajout du contexte sous la clé @contextId
            contextCount[mes.contexteId] = {
              contextName: context.nom,
              mesCount: 0,
              okCount: 0,
              nokCount: 0,
              dateList: [],
            }
          }
        } else // Si l'objet @measureCount contient déjà une mesure du même pilotage
        {
          // Ajout de la mesure sous la clé @pilotageId qui existe déjà
          measureCount[mes.pilotageId].measures.push({
            measure: mes,
            measureConformity: getMeasureConformity(mes, dimList)
          });
          measureCount[mes.pilotageId].measuresNb += mes.values.length; // Incrément du nombre de cotes mesurées
        }
        //Si l'objet @measuresByDim ne contient pas encore de mesure de la cote @coteId de la mesure actuelle
        if (!Object.keys(measuresByDim).includes(mes.coteId)) {
          // On initialise avec la clé @coteId et on crée la future liste des mesures avec la première mesure actuelle
          measuresByDim[mes.coteId] = {
            dim: dims.find(c => c._id == mes.coteId), // stockage de la cote en tant qu'objet
            measures: [mes], // initialisation de la liste des mesures
          };
        } else {
          // Si la cote a déjà une mesure de saisie dans la liste on vient rajouter la mesure actuelle à cette liste
          measuresByDim[mes.coteId].measures.push(mes);
        }

      });

      $.each(measuresByDim, function(index, dim) {
        let valList = []
        $.each(dim.measures, function(i, mes) {
          let context = contextList.find(e => e._id == mes.contexteId)
          if (!["Après Changement d'Outil", "Démarrage Production"].includes(context.nom)) {
            valList = valList.concat(mes.values);
          }
        });
        if (dim.dim.tolerance_min) {
          dim.upperTol = dim.dim.nominal + dim.dim.tolerance_max;
          dim.lowerTol = dim.dim.nominal + dim.dim.tolerance_min;
          dim.it = Number(dim.dim.tolerance_max) - Number(dim.dim.tolerance_min)
          if (valList.length > 19) {
            dim.dev = getStandardDeviation(valList);
            dim.cp = dim.it / (6 * dim.dev);
            dim.mean = average(valList);
            dim.cpk = Math.min(dim.upperTol - dim.mean, dim.mean - dim.lowerTol) / (3 * dim.dev);
          }
        } else // Cas ou la cote n'a qu'une tolerance max
        {
          dim.it = dim.dim.tolerance_max;
          dim.upperTol = dim.dim.nominal + dim.dim.tolerance_max;
          if (valList.length > 19) {
            dim.dev = getStandardDeviation(valList);
            dim.mean = average(valList);
            dim.cpk = (dim.upperTol - dim.mean) / (3 * dim.dev);
          }
        }
        dim.valNb = valList.length
      });

      // On reboucle sur les pilotages de l'objet measureCount qui pour l'instant ne rassemble que les mesures par pilotage
      $.each(measureCount, function(index, pilotage) {
        // On initialise la conformité du pilotage (inexistant sur Ellisetting) à true
        let pilotageConf = true;
        // On boucle sur chaque mesure du pilotage
        $.each(pilotage.measures, function(index, mes) {
          // On passe la variable du pilotage à false si la mesure est NC
          if (!mes.measureConformity) {
            pilotageConf = false;
          }
        });
        // On stocke la conformité calculée du pilotage dans l'objet @pilotage de @measureCount
        pilotage.conformity = pilotageConf;

        // Incrément de @totalMesCount systématique pour chaque mesure
        totalMesCount++;
        // Comptage des pilotages par contexte
        contextCount[pilotage.context].mesCount++;
        // Comptage des pilotages conformes par contexte
        contextCount[pilotage.context].okCount += (pilotageConf ? 1 : 0);
        // Comptage des pilotages non conformes par contexte
        contextCount[pilotage.context].nokCount += (pilotageConf ? 0 : 1);
        // Ajout de la date de mesure dans la liste
        contextCount[pilotage.context].dateList.push(pilotage.date);
      });
      // Si l'objet @measureCount contient au moins une mesure
      if (Object.keys(measureCount).length) {
        // Déclenchement de la création graphique du bloc relatif à la pièce
        appendPartSection(part, contextList, dims, measureCount, contextCount, measuresByDim, shiftInfo);
      }
    });

  });

}

// Fonction de récupération de la conformité d'une mesure @mes vis-à-vis d'une liste de cotes @dims
function getMeasureConformity(mes, dims) {
  // Initialisation de la variable de conformité @conf
  let conf = true;
  // Récupération de la cote liée à la mesure @mes
  let mesDim = dims.find(c => c._id == mes.coteId);
  // Stockage des cotes mini et maxi
  if (mesDim) {
    let upperTol = mesDim.nominal + mesDim.tolerance_max;
    let lowerTol = mesDim.nominal + mesDim.tolerance_min;

    // Boucle sur les valeurs de la mesure pour récupération de la conformité de toutes les valeurs
    $.each(mes.values, function(index, value) {
      if (Number(value) > Number(upperTol) || Number(value) < Number(lowerTol)) {
        conf = false;
      }
    });
  }
  return conf;
}

// Fonction de récupération des bornes temporelles
function getTimeWindow() {

  let formattedDate = {}

  let todayDate = new Date();
  let timezone = todayDate.toString().substring(28, 31) + ":" + todayDate.toString().substring(31, 33);

  let startDate = new Date($('#start-time').val() + timezone);
  let endDate = new Date($('#end-time').val() + timezone);

  formattedDate = {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
  return formattedDate;
}


// Fonction de récupération des bornes temporelles
function setTimeWindow() {
  let date = $('#datepicker').datepicker("getDate");
  let startTime = "";
  let endTime = "";
  let dateString = String($.datepicker.formatDate('yy-mm-dd', date));

  switch ($('#shift').val()) {
    case "morning":
      startTime = dateString + "T04:15:00.000";
      endTime = dateString + "T12:15:00.000";
      break;
    case "afternoon":
      startTime = dateString + "T12:15:00.000";
      endTime = dateString + "T20:15:00.000";
      break;
    case "night":
      startTime = dateString + "T20:15:00.000";
      date.setDate(date.getDate() + 1);
      endTime = String($.datepicker.formatDate('yy-mm-dd', date)) + "T04:15:00.000";
      break;
    default:
  }

  $('#start-time').val(startTime);
  $('#end-time').val(endTime);
}


// Fonction de création du div contenant les informations sur une pièce
function appendPartSection(part, contextList, dims, measureCount, contextCount, measuresByDim, shiftInfo) {

  // Nombre total de mesures
  let mesTotalCount = 0;
  // Nombre de mesures NC
  let nokCount = 0;

  // Boucle sur les contextes de @contextCount
  $.each(Object.keys(contextCount), function(index, ctxtId) {
    // Comptage total des mesures
    mesTotalCount += contextCount[ctxtId].mesCount;
    // Comptage des mesures NC n'appartenant pas à la liste suivante
    if (!["Après Changement d'Outil", "Démarrage Production"].includes(contextCount[ctxtId].contextName)) {
      nokCount += contextCount[ctxtId].nokCount;
    }
  });

  // Création de l'ossature HTML du report d'une pièce
  $('#response-container').append('<div class="part-report" data-partid="' + part._id + '">\
    <div class="part-accordion-header" style="background-color: ' + (nokCount ? "red" : (mesTotalCount ? "green" : "grey")) + ';">\
    <span class="title">' + part.nom + '</span>\
    <p><span>Nombre de mesures : ' + mesTotalCount + (!nokCount ? "" : (' dont ' + nokCount + ' mesure(s) non conforme(s)')) + '</span></p>\
    <div class="context-title" data-partid="' + part._id + '"></div>\
    </div>\
    <div class="part-report-content" data-partid="' + part._id + '">\
      <div class="part-subaccordion-header">Aperçu Général</div>\
      <div class="general-part-section"></div>\
      <div class="part-subaccordion-header">Suivi SPC par côte</div>\
      <div class="spc-dim-container">\
        <div class="spc-section">\
          <table class="display"><thead><tr>\
            <th>Nom</th>\
            <th>Nominal</th>\
            <th>Min</th>\
            <th>Max</th>\
            <th>IT</th>\
            <th>Moyenne</th>\
            <th>CP</th>\
            <th>CPK</th>\
            <th>Nb Valeurs</th>\
          </tr></thead><tbody></tbody></table>\
        </div>\
        <div id="spc-section-graph-container-' + part._id + '" class="spc-section-graph-container"></div>\
      </div>\
    </div>\
  </div>');

  // Petit rapport du nombre de controles par contexte
  let contextHtml = "";
  $.each(Object.keys(contextCount), function(index, key) {
    c = contextCount[key];
    contextHtml += '<p>' + c.contextName + ' : ' + c.mesCount + (c.nokCount ? ' (dont ' + c.nokCount + ' NOK)' : '') + '</p>'
  });
  $('.context-title[data-partid="' + part._id + '"]').html(contextHtml);

  $('.part-report[data-partid="' + part._id + '"]').accordion({
    header: '.part-accordion-header',
    collapsible: true,
    active: false,
    heightStyle: "content",
  });

  $('.part-report-content[data-partid="' + part._id + '"]').accordion({
    header: '.part-subaccordion-header',
    collapsible: true,
    active: false,
    heightStyle: "content",
  });

  $('.part-report-content[data-partid="' + part._id + '"] .general-part-section').append('\
  <div class="reports-table-container"><table id="table-' + part._id + '" class="display" style="width:100%">\
    <thead><tr><th>Contexte</th><th>Date</th><th>Conformité</th><th>Nombre de cotes mesurées</th></tr></thead>\
    <tbody></tbody>\
  </table></div>\
  <div class="report-container" data-partid="' + part._id + '"></div>\
  ');

  $.each(Object.keys(measureCount), function(index, key) {

    let reportTitle = 'Contexte : ' + measureCount[key].contextName + ' / Heure : ' + measureCount[key].date + ' / Conformité : ' + (measureCount[key].conformity ? "OK" : "NOK")

    let $table = $('#table-' + part._id);
    $('#table-' + part._id + ' tbody').append('<tr data-reportid="' + key + '" style="color: ' + (measureCount[key].conformity ? "green" : "red") + '">\
      <td>' + measureCount[key].contextName + '</td>\
      <td>' + moment(measureCount[key].date).format('YYYY-MM-DD à HH:mm:ss') + '</td>\
      <td>' + (measureCount[key].conformity ? "OK" : "NOK") + '</td>\
      <td>' + measureCount[key].measuresNb + '</td>\
    </tr>');

    $('tr[data-reportid="' + key + '"]').on('click', function(e) {
      $('div.report-container[data-partid="' + part._id + '"]').empty();
      $.each(measureCount[key].measures, function(index, mes) {
        let values = "";
        let dim = dims.find(c => c._id == mes.measure.coteId);
        $.each(mes.measure.values, function(index, val) {
          values += ((values ? ";" : "") + val)
        });
        $('div.report-container[data-partid="' + part._id + '"]').append('<p class="report-line"  style="color: ' + (mes.measureConformity ? "auto" : "red") + '">\
        ' + dim.nom + ' : <b>' + values + '</b> [min : ' + custRound(Number(dim.nominal) + Number(dim.tolerance_min), 3) + ' / max : ' + custRound(Number(dim.nominal) + Number(dim.tolerance_max), 3) + ' ]' + '\
      </p>');
      });
    });

    if (Object.keys(measureCount).length == index + 1) {
      $('#table-' + part._id).DataTable({
        "order": [
          [1, "asc"]
        ],
        "paging": false,
      });
    }

  });

  $.each(Object.keys(measuresByDim), function(index, key) {

    let curDim = measuresByDim[key].dim;

    let mesList = measuresByDim[key].measures;

    let minTol = Math.round(1000 * (Number(curDim.nominal) + Number(curDim.tolerance_min))) / 1000;
    let maxTol = Math.round(1000 * (Number(curDim.nominal) + Number(curDim.tolerance_max))) / 1000;

    let valList = [];
    if (curDim.tolerance_min) {
      valList.push([new Date(shiftInfo.start), null, "", null, curDim.nominal, "Nominal : " + curDim.nominal, minTol, "Tolérance Min : " + minTol, maxTol, "Tolérance Max : " + maxTol]);
    } else {
      valList.push([new Date(shiftInfo.start), null, "", null, curDim.nominal, "Nominal : " + curDim.nominal, maxTol, "Tolérance Max : " + maxTol]);
    }

    let vAxisMinValue = curDim.tolerance_min ? minTol : 0;
    let vAxisMaxValue = maxTol;

    $.each(mesList, function(index, mes) {
      $.each(mes.values, function(i, val) {
        let cDate = new Date(mes.date);
        let htmlTooltip = "<div class='google-chart-tooltip'><p>Date : " + cDate.toLocaleString() + "</p><p>Mesure : " + Number(val) + "</p><p>Contexte : " + contextCount[mes.contexteId].contextName + "</p>" +
          (mes.commentaire ? ("<p>Commentaire : " + mes.commentaire + "</p>") : "") +
          "</div>";
          let pointStyle = ["Après Changement d'Outil", "Démarrage Production"].includes(contextCount[mes.contexteId].contextName) ? 'point { size: 11; shape-type: triangle; fill-color: #ffa500; }' : null
        if (curDim.tolerance_min) {
          valList.push([new Date(mes.date), Number(val), htmlTooltip, pointStyle, curDim.nominal, "Nominal : " + curDim.nominal, minTol, "Tolérance Min : " + minTol, maxTol, "Tolérance Max : " + maxTol]);
        } else {
          valList.push([new Date(mes.date), Number(val), htmlTooltip, pointStyle, curDim.nominal, "Nominal : " + curDim.nominal, maxTol, "Tolérance Max : " + maxTol]);
        }
        vAxisMinValue = Math.min(vAxisMinValue, Number(val));
        vAxisMaxValue = Math.max(vAxisMaxValue, Number(val));
      });
    });

    if (curDim.tolerance_min) {
      valList.push([new Date(shiftInfo.end), null, "", null, curDim.nominal, "Nominal : " + curDim.nominal, minTol, "Tolérance Min : " + minTol, maxTol, "Tolérance Max : " + maxTol]);
    } else {
      valList.push([new Date(shiftInfo.end), null, "", null, curDim.nominal, "Nominal : " + curDim.nominal, maxTol, "Tolérance Max : " + maxTol]);
    }

    let lineString = '\
    <td>' + curDim.nom + '</td>\
    <td>' + Number(curDim.nominal) + '</td>\
    <td>' + custRound(emptyNumber(measuresByDim[key].lowerTol), 3) + '</td>\
    <td>' + custRound(emptyNumber(measuresByDim[key].upperTol), 3) + '</td>\
    <td>' + custRound(emptyNumber(measuresByDim[key].it), 3) + '</td>\
    <td>' + custRound(emptyNumber(measuresByDim[key].mean), 3) + '</td>\
    <td>' + custRound(emptyNumber(measuresByDim[key].cp), 2) + '</td>\
    <td>' + custRound(emptyNumber(measuresByDim[key].cpk), 2) + '</td>\
    <td>' + emptyNumber(measuresByDim[key].valNb) + '</td>';

    let stringifiedValList = JSON.stringify(valList).replace(/"/gi, '\'');

    $('.part-report-content[data-partid="' + part._id + '"] .spc-section tbody').append('\
    <tr class="dim-content" data-dimid="' + key + '"\
      id="chart-' + key + '"\
      data-datalist="' + stringifiedValList + '"\
      data-starttime="' + shiftInfo.start + '"\
      data-endtime="' + shiftInfo.end + '"\
      data-dimname="' + curDim.nom + '"\
      data-vaxismaxval="' + Number(vAxisMaxValue + 0.1 * Math.abs(vAxisMaxValue - vAxisMinValue)) + '"\
      data-vaxisminval="' + Number(vAxisMinValue - 0.1 * Math.abs(vAxisMaxValue - vAxisMinValue)) + '"\
      >' + lineString + '</tr>');

    $('.dim-content[data-dimid="' + key + '"]').on('click', function(e) {
      $chartDataContainer = $('#chart-' + key);
      $chartDestination = $('spc-section-graph-container-' + part._id);
      $chartDestination.empty();

      var data = new google.visualization.DataTable();
      data.addColumn('date', 'Date');
      data.addColumn('number', 'Mesure');
      data.addColumn({
        type: 'string',
        role: 'tooltip',
        p: {
          'html': true
        },
      });
      data.addColumn({
        type: 'string',
        role: 'style'
      });
      data.addColumn('number', 'Nominal')
      data.addColumn({
        type: 'string',
        role: 'tooltip'
      });
      if (curDim.tolerance_min) {
        data.addColumn('number', 'Min Tolerance');
        data.addColumn({
          type: 'string',
          role: 'tooltip'
        });
      }
      data.addColumn('number', 'Max Tolerance');
      data.addColumn({
        type: 'string',
        role: 'tooltip'
      });
      let dataImportedList = JSON.parse($chartDataContainer.data('datalist').replace(/'/gi, '\"').replace(/="/gi, '=\\"').replace(/">/gi, '\\">').replace(/d"Outil/gi, 'd\'Outil'));

      $.each(dataImportedList, function(i, e) {
        e[0] = new Date(e[0])
      })
      data.addRows(dataImportedList);
      let options = {
        width: 800,
        height: 600,
        title: $chartDataContainer.data('dimname'),
        hAxis: {
          title: 'Date',
          minValue: new Date($chartDataContainer.data('starttime')),
          maxValue: new Date($chartDataContainer.data('endtime'))
        },
        vAxis: {
          title: 'Mesure',
          viewWindow: {
            min: Number($chartDataContainer.data('vaxisminval')),
            max: Number($chartDataContainer.data('vaxismaxval'))
          },
        },
        seriesType: 'scatter',
        series: {
          1: {
            type: 'line',
            color: 'green',
            lineDashStyle: [4, 4]
          },
          2: {
            type: 'line',
            color: 'red'
          },
          3: {
            type: 'line',
            color: 'red'
          }
        },
        tooltip: {
          isHtml: true
        },
      };

      let container = document.getElementById('spc-section-graph-container-' + part._id);
      let chart = new google.visualization.ComboChart(container);
      chart.draw(data, options);

    });
  });

  $('.part-report-content[data-partid="' + part._id + '"] .spc-section table').DataTable({
    lengthChange: false,
    pageLength: 10,
  });

}

function getStandardDeviation(array) {
  const n = array.length;
  const mean = array.reduce((a, b) => a + b) / n;
  return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
}

function average(array) {
  const n = array.length;
  const mean = array.reduce((a, b) => a + b) / n;
  return mean;
}

function emptyNumber(str) {
  return (str ? Number(str) : "");
}

function custRound(real, nb) {
  if (real) {
    let pw = Math.pow(10, (nb ? nb : 0));
    return Math.round(Number(real) * pw) / pw;
  } else {
    return ""
  }
}
