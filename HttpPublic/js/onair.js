function getTime(time){
	var date = new Date(time);
	return ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2)
}

function updateEPG(obj){
	var time = obj.data('end') - new Date().getTime();
	setTimeout(function(){getEPG(obj);}, time);
}

function getEvent(event){
	var title = event.children('event_name').text().replace(/　/g,' ').replace(/\[(新|終|再|交|映|手|声|多|字|二|Ｓ|Ｂ|SS|無|Ｃ|S1|S2|S3|MV|双|デ|Ｄ|Ｎ|Ｗ|Ｐ|HV|SD|天|解|料|前|後|初|生|販|吹|PPV|演|移|他|収)\]/g,'<span class="mark mdl-color--accent mdl-color-text--accent-contrast">$1</span>');
	var textTime = event.children('startTime').text();
	var startTime = new Date(event.children('startDate').text()+' '+textTime).getTime();
	var duration = Number(event.children('duration').text());
 	return {
		eid: event.children('eventID').text(),
		title: title,
		textTime: textTime.match(/(\d+:\d+):\d+/)[1],
		startTime: startTime,
		endTime: startTime+duration*1000,
		duration: duration
	}
}

function getEPG(obj){
	var data = obj.data();
	$.get(root + 'api/EnumEventInfo?onair=&onid=' + data.onid + '&tsid=' + data.tsid + '&sid=' + data.sid).done(function(xhr){
		var event,  next, data;
		if ($(xhr).find('eventinfo').length > 0){
			event=getEvent( $($(xhr).find('eventinfo')[0]) );
			next=getEvent( $($(xhr).find('eventinfo')[1]) );
			data = {
				eid: event.eid,
		    	nexteid: next.eid,
				duration: event.duration,
		    	start: event.startTime/1000,
		    	end: event.endTime
			};
			obj.data(data).find('.startTime').text(event.textTime).next('.endTime').text('～' + getTime(event.endTime));
			obj.find('.title').html(event.title);
			obj.find('.nextstartTime').text(next.textTime).next('.nextendTime').text('～' + getTime(next.endTime));
			obj.find('.nexttitle').html(next.title);
			updateEPG(obj);
		}
	});
}

setInterval(function(){
	$('.mdl-layout__tab-panel.is-active>.mdl-list__item').each(function(){
		var data = $(this).data();
		if (data.end < new Date().getTime()){
			updateEPG($(this));
		}else{
			var progress = (new Date().getTime()/1000 - data.start) / data.duration  * 100;
			$(this).children('.mdl-progress').get(0).MaterialProgress.setProgress(progress);
		}
	});
},1000);

$(function(){
	$('.mdl-layout__tab-panel.is-active>.mdl-list__item').each(function(){
		updateEPG($(this));
	});

	$('#seek').prop('disabled', true);
	$('#video').data('keepdisk', true);
	$('.cast').click(function(){
		$('#popup').addClass('is-visible');
		$('.bar').addClass('is-visible');
		
		var obj = $(this).parents('li');
		$('#titlebar').text(obj.data('name'));

		var BonD = 'BonDriver_Proxy-T.dll';
		var quality = localStorage.getItem('quality') ? '&quality=' + localStorage.getItem('quality') : '';
		var path = root + 'api/TvCast?onid=' + obj.data('onid') + '&sid='+ obj.data('sid') + quality;
		$('#video').addClass('is-loadding').attr('src', path);
		$('#video').get(0).play();
	});

	$('.epginfo').click(function(){
		var data = $(this).parents('li').data();
		if ($(this).hasClass('next')) data.eid = data.nexteid;

		if($(this).hasClass('panel')){
			showSpinner(true);
			$('.mdl-tabs__panel').addClass('is-active').scrollTop(0);
			$('[href="#recset"], #recset, #sidePanel, .open').removeClass('is-visible is-active clicked open');
			$('[href="#detail"], #detail').addClass('is-active');
			$(this).parents('li').addClass('open');
			$('.sidePanel-content').scrollTop(0);

			$.ajax({
				url: root + 'api/GetEventInfo',
				data: data,
				success: function(result, textStatus, xhr){
					var xml = $(xhr.responseXML);

					if (xml.find('eventinfo').length > 0){
						var onid = Number(xml.find('ONID').first().text());
						var tsid = Number(xml.find('TSID').first().text());
						var sid = Number(xml.find('SID').first().text());
						var eid = Number(xml.find('eventID').first().text());

						var startDate = xml.find('startDate').text();
						var startTime = xml.find('startTime').text();
						var endTime = new Date(startDate+' '+startTime).getTime() + Number(xml.find('duration').text())*1000;

						var genre = '';
						var audio = '';
						var other = '';
						xml.find('contentInfo').each(function(){
							genre = genre + '<li>' + $(this).find('component_type_name').text();
						});
						xml.find('audioInfo').each(function(){
							audio = audio + '<li>'+ $(this).find('component_type_name').text() + ' '+ $(this).find('text').text() + '<li>サンプリングレート : ' + {1:'16',2:'22.05',3:'24',5:'32',6:'44.1',7:'48'}[$(this).find('sampling_rate').text()] + 'kHz';
						});
						if (onid<0x7880 || 0x7FE8<onid){
							if (xml.find('freeCAFlag').first().text() == 0){
								other = '<li>無料放送';
							}else{
								other = '<li>有料放送';
							}
						}

						endTime = new Date(endTime);

						if (endTime>new Date()){
							$('#sidePanel .mdl-tabs__tab-bar').show();
							$('#sidePanel .mdl-dialog__actions').show();
						}else{
							$('#sidePanel .mdl-tabs__tab-bar').hide();
							$('#sidePanel .mdl-dialog__actions').hide();
						}

						$('#title').html(xml.find('event_name').text().replace(/　/g,' ').replace(/\[(新|終|再|交|映|手|声|多|字|二|Ｓ|Ｂ|SS|無|Ｃ|S1|S2|S3|MV|双|デ|Ｄ|Ｎ|Ｗ|Ｐ|HV|SD|天|解|料|前|後|初|生|販|吹|PPV|演|移|他|収)\]/g,'<span class="mark mdl-color--accent mdl-color-text--accent-contrast">$1</span>'));
						$('#sidePanel_date').html(startDate+' '+startTime.match(/(\d+:\d+):\d+/)[1] + '～' + ('0'+endTime.getHours()).slice(-2) + ':' + ('0'+endTime.getMinutes()).slice(-2));
						$('#service').html(xml.find('service_name').text());
						$('#links').html($('.open .links a').clone(true));
						$('#summary p').html(xml.find('event_text').text().replace(/(https?:\/\/[\w?=&.\/-;#~%-]+(?![\w\s?&.\/;#~%"=-]*>))/g, '<a href="$1">$1</a> ').replace(/\n/g,'<br>'));
						$('#ext').html(xml.find('event_ext_text').text().replace(/(https?:\/\/[\w?=&.\/-;#~%-]+(?![\w\s?&.\/;#~%"=-]*>))/g, '<a href="$1">$1</a> ').replace(/\n/g,'<br>'));
						$('#genreInfo').html(genre);
						$('#videoInfo').html('<li>' + xml.find('videoInfo').find('component_type_name').text() + ' ' + $(this).find('videoInfo').find('text').text());
						$('#audioInfo').html(audio);
						$('#otherInfo').html(other +
							'<li>OriginalNetworkID:' + onid + '(0x' + ('000'+onid.toString(16).toUpperCase()).slice(-4) + ')' +
							'<li>TransportStreamID:' + tsid + '(0x' + ('000'+tsid.toString(16).toUpperCase()).slice(-4) + ')' +
							'<li>ServiceID:'         + sid  + '(0x' + ('000'+ sid.toString(16).toUpperCase()).slice(-4) + ')' +
							'<li>EventID:'           + eid  + '(0x' + ('000'+ eid.toString(16).toUpperCase()).slice(-4) + ')' );
						$('#epginfo').attr('href', 'epginfo.html?onid=' + onid + '&tsid=' + tsid + '&sid=' + sid + '&eid=' + eid);

						$('[name=onid]').val(onid);
						$('[name=tsid]').val(tsid);
						$('[name=sid]').val(sid);
						$('[name=eid]').val(eid);

						function searchReserve(){
							var reserve;
							ReserveAutoaddList.find('reserveinfo').each(function(){
								if (onid == $(this).find('ONID').text() &&
								    tsid == $(this).find('TSID').text() &&
								     sid == $(this).find('SID').text() &&
								     eid == $(this).find('eventID').text() ){
									var id = $(this).find('ID').text();

									$('#set').attr('action', root + 'api/ReserveChg?id='+id);
									$('#del').attr('action', root + 'api/ReserveDel?id='+id);
									$('#reserved, #delreseved').show();
									$('[name=presetID]').data('reseveid', id).val(65535);
									$('#reserve').text('変更');

									setRecSettting($(this));
									reserve = true;

									return false;
								}
							});

							if (!reserve) setDefault();

							$('#sidePanel, .close_info.mdl-layout__obfuscator').addClass('is-visible');
							showSpinner();
						}

						$.get(root + 'api/Common', {notify: 2}, function(result, textStatus, xhr){
							var Count = $(xhr.responseXML).find('info').text();
							if(ReserveAutoaddList && Count == notifyCount){
								searchReserve();
							}else{
								notifyCount = Count;
								sessionStorage.setItem('notifyCount', notifyCount);
								$.get(root + 'api/EnumReserveInfo', function(result, textStatus, xhr){
									ReserveAutoaddList = $(xhr.responseXML);
									searchReserve();
								});
							}
						});
					}else{
						notification.MaterialSnackbar.showSnackbar({message: 'Error : ' + xml.find('err').text()});
						showSpinner();
					}
				}
			});
		}else{
			window.open('epginfo.html?onid=' + data.onid + '&tsid=' + data.tsid + '&sid=' + data.sid + '&eid=' + data.eid, '_blank');
		}
	});

	$('.close_info').click(function(){
		$('#sidePanel, .close_info.mdl-layout__obfuscator, .open').removeClass('is-visible open');
	});
});

