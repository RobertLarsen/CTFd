currentMonday = null;
ONE_HOUR = 1000 * 60 * 60;
ONE_DAY  = ONE_HOUR * 24;
ONE_WEEK = ONE_DAY * 7;

DAYS = new Array();
DAYS_LONG = new Array();
DAYS.push('sun');DAYS_LONG.push('Sunday');
DAYS.push('mon');DAYS_LONG.push('Monday');
DAYS.push('tue');DAYS_LONG.push('Tuesday');
DAYS.push('wed');DAYS_LONG.push('Wednesday');
DAYS.push('thu');DAYS_LONG.push('Thursday');
DAYS.push('fri');DAYS_LONG.push('Friday');
DAYS.push('sat');DAYS_LONG.push('Saturday');
MONTHS_LONG = new Array();
MONTHS_LONG.push('January');
MONTHS_LONG.push('February');
MONTHS_LONG.push('March');
MONTHS_LONG.push('April');
MONTHS_LONG.push('May');
MONTHS_LONG.push('June');
MONTHS_LONG.push('July');
MONTHS_LONG.push('August');
MONTHS_LONG.push('November');
MONTHS_LONG.push('December');

$(function() {
    $('#appointment').dialog({
        modal: true,
        draggable: false,
        resizable: false,
        autoOpen: false,
        buttons: {
            'Cancel' : CloseDialog,
            'OK' : MakeAppointment
        }
    });

    $('#appointments').dialog({
        modal: true,
        draggable: false,
        resizable: false,
        autoOpen: false,
        close: ResetAppointmentLists
    });
    ResetAppointmentLists();

    //Build schedule-table
    var table_html = '';
    var days = new Array(
        'mon', 'tue', 'wed', 'thu', 'fri', 'sat'
    );
    for (var hour = 8; hour <= 16; hour++) {
        table_html += '<tr><td class="hour_indicator">' + TwoDigits(hour) + ':00</td>';
        days.forEach(function(day) {
            table_html += '<td class="free" id="' + day + '_' + TwoDigits(hour) + '"></td>';
        });
        table_html += '</tr>';
    }
    $('#schedule>tbody').html(table_html);
    currentMonday = CalculateMonday(new Date());
    RetrieveWeekData(currentMonday);
});

function CloseDialog() {
    $(this).dialog('close');
}

function ResetAppointmentLists() {
    $('#appointments_list').html(
         '<table class="dialog">'
        +'    <tr>'
        +'        <td>'
        +'            Username:'
        +'        </td>'
        +'        <td>'
        +'            <input style="width: 150px;" type="text" id="list_username" name="username"/>'
        +'        </td>'
        +'    </tr>'
        +'    <tr>'
        +'        <td>'
        +'            Password:'
        +'        </td>'
        +'        <td>'
        +'            <input style="width: 150px;" type="password" id="list_password" name="password"/>'
        +'        </td>'
        +'    </tr>'
        +'</table>'
    );
    $('#appointments').dialog({
        buttons: {
            'Cancel' : CloseDialog,
            'OK' : ListAppointments
        }
    });
}

function NextWeek() {
    currentMonday = new Date(currentMonday.getTime() + ONE_WEEK);
    RetrieveWeekData(currentMonday);
}

function PreviousWeek() {
    currentMonday = new Date(currentMonday.getTime() - ONE_WEEK);
    RetrieveWeekData(currentMonday);
}

function CalculateMonday(d) {
    var day = (d.getDay() + 6) % 7;
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    d = new Date(d.getTime() - (((d.getDay() + 6) % 7) * 1000 * 60 * 60 * 24));
    return d;
}

function RetrieveWeekData(d) {
    endTime = new Date(d.getTime() + ONE_WEEK);
    $.ajax({
        url: 'weekdata',
        data: {
            begin: Math.round(d.getTime() / 1000),
            end: Math.round(endTime.getTime() / 1000)
        },
        success: HandleWeekData
    });

    var cur = new Date(d.getTime());
    for (var i = 0; i < 6; i++) {
        var txt = TwoDigits(cur.getDate()) + '/' + TwoDigits(cur.getMonth() + 1);
        $('#' + DAYS[i + 1]).text(txt);
        cur = new Date(cur.getTime() + ONE_DAY);
    }
}

function HandleWeekData(data) {
    $('.free').unbind('click', TableClick);
    $('.occupied').removeClass('occupied').addClass('free');
    $('.free').text('Free');

    $(data).find('appointment').each(function() {
        var timestamp = parseInt($(this).find('timestamp').text());
        var dateObj = new Date(timestamp * 1000);
        var id = DAYS[dateObj.getDay()] + '_' + TwoDigits(dateObj.getHours());
        $('#' + id).removeClass('free').addClass('occupied').text('Occupied');
    });
    $('.free').click(TableClick);
}

function TwoDigits(num) {
    return num < 10 ? '0' + num : '' + num;
}

function TableClick() {
    var id = this.id;
    var day = id.substr(0, 3);
    var hourStr = id.substr(4, 2);
    if (hourStr[0] === '0') {
        hourStr = hourStr.substr(1, 1);
    }
    var hour = parseInt(hourStr);
    var dayNum = 0;
    for (dayNum = 0; dayNum < DAYS.length; dayNum++) {
        if (DAYS[dayNum] === day) {
            break;
        }
    }

    var timestamp = currentMonday.getTime() + (dayNum - 1) * ONE_DAY + hour * ONE_HOUR;
    var clickedDate = new Date(timestamp);
    ShowAppointmentDialog(clickedDate);
}

function FormatDateTime(time) {
    var h = (time.getHours() % 12);
    h = (h === 0 ? 12 : h);
    return DAYS_LONG[time.getDay()] + ', ' + MONTHS_LONG[time.getMonth()] + ' ' + time.getDate() + '. ' + h + ' ' + (time.getHours() < 12 ? 'AM' : 'PM');
}

function ShowAppointmentDialog(time) {
    jQuery.data($('#appointment')[0], 'time', time);
    $('#appointment_time').text('At ' + FormatDateTime(time));
    $('#appointment').dialog('open');
}

function MakeAppointment() {
    var time = jQuery.data($('#appointment')[0], 'time');
    var username = $('#app_username').val();
    var password = $('#app_password').val();
    if (username !== '' && password !== '') {
        $('#appointment').dialog('close');
        $.ajax({
            url: 'makeappointment',
            data: {
                'time' : Math.round(time.getTime() / 1000),
                'user' : username,
                'pass' : password
            },
            success: function() {
                RetrieveWeekData(currentMonday);
            }
        });
    }
}

function ShowMyAppointments() {
    $('#appointments').dialog('open');
}

function ListAppointments() {
    var username = $('#list_username').val();
    var password = $('#list_username').val();
    var now = new Date();

    $.ajax({
        url: 'listmyappointments',
        data: {
            'user': username,
            'pass': password,
            'time': Math.round(now.getTime() / 1000)
        },
        success: function(data) {
            var html = '';
            $(data).find('appointment>timestamp').each(function() {
                var time = new Date(parseInt($(this).text()) * 1000);
                html += '<li>' + FormatDateTime(time) + '<br/>';
            });
            if (html === '') {
                html = 'You have no upcoming appointments or you provided bad credentials.';
            } else {
                html = 'Your upcoming appointments are:<br><ul class="date">' + html + '</ul>';
            }
            $('#appointments_list').html(html);
            $('#appointments').dialog({
                buttons: {
                    'Close' : CloseDialog
                }
            });
        }
    });

}
