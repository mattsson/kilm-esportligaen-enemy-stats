const request = require('request')

// 1. Tjek hvilke kommende kampe, KILM har via https://app.esportligaen.dk/api/team/899?includeViewInfo=true
// 2. Slå kommende modstandere op via fx https://app.esportligaen.dk/api/team/1787?includeViewInfo=true
// 3. Slå alle modstanders kampe op via https://app.esportligaen.dk/api/match/details/2192
// 4. Hent kampstatisk og vis på web

// const headers = {
// 	'Authorization': 'Basic bWFyY3VzQHNoYXBlLmRrOmg3a0M5WFZqd0JIMWhOS1htRTNnM0U1Qw==',
// 	'Content-Type': 'application/json'
// }

const kilmTeamID = 899

// Display stats
exports.stats = async (req, res, next) => {
	try {

		const upcomingEnemyTeamsDict = await upcomingEnemyTeams()

		var teamsWithMaps = new Array()
		for (const [teamName, team] of Object.entries(upcomingEnemyTeamsDict)) {

			var teamObj = {
				name: team.name,
				id: team.id,
				maps: {}
			}

			const pastMatchesArr = await pastMatches(team.id)
			for (const pastMatch of pastMatchesArr) {

				const detailedMatchInfoObj = await detailedMatchInfo(pastMatch.id)

				if (detailedMatchInfoObj.mapName == null) {
					continue
				}

				console.log('found match with map name')

				const firstTeam = detailedMatchInfoObj.MatchTeams[0]

				const teamPickedMap = firstTeam.team_id == team.id
				const mapName = detailedMatchInfoObj.mapName.replace(' ', '')

				let matchStatus

				const teamScore = teamPickedMap ? firstTeam.score : detailedMatchInfoObj.MatchTeams[1].score

				var cleanMap = {
					name: mapName,
					played: 0,
					picked: 0,
					won: 0,
					tied: 0,
					lost: 0,
					winPercentage: 0
				}

				var map

				if (teamObj.maps.hasOwnProperty(mapName) == true) {
					map = teamObj.maps[mapName]
				} else {
					map = cleanMap
				}

				if (teamPickedMap) {
					map.picked = map.picked + 1
				}

				if (teamScore == 15) {
					map.tied = map.tied + 1
				} else if (teamScore > 15) {
					map.won = map.won + 1
				} else if (teamScore < 15) {
					map.lost = map.lost + 1
				} else {
					console.log('ERROR Could not find score for match ' + detailedMatchInfoObj.id)
				}

				map.played = map.played + 1

				map.winPercentage = map.won / map.played * 100

				teamObj.maps[mapName] = map
			}

			teamsWithMaps.push(teamObj)
		}
		
			
		var html = ''
		for (const team of teamsWithMaps) {

			html +=
			`
				<h2>${team.name}</h2>
				<table>
				<tr>
					<th>Map</th>
					<th>Played</th>
					<th>Picked</th>
					<th>Won</th>
					<th>Tied</th>
					<th>Lost</th>
					<th>Win percentage</th>
				<tr>
			`

			// Create items array
			const mapsArray = Object.values(team.maps)
			
			mapsArray.sort((a,b) => (a.winPercentage > b.winPercentage) ? 1 : ((b.winPercentage > a.winPercentage) ? -1 : 0))

			for (let map of mapsArray) {

				var color

				if (map.winPercentage <= 20) {
					color = '#00FF00'
				} else if (map.winPercentage <= 50) {
					color = '#FFFF00'
				} else if (map.winPercentage <= 70) {
					color = '#FFA500'
				} else {
					color = '#FF0000'
				}

				html +=
				`
					<tr>
						<td>${map.name}</td>
						<td>${map.played}</td>
						<td>${map.picked}</td>
						<td>${map.won}</td>
						<td>${map.tied}</td>
						<td>${map.lost}</td>
						<td style="background-color:${color}">${map.winPercentage.toFixed(0)}%</td>
					</tr>
				`
			}

			html +=
			`
				</table>
				<br>
				<br>
			`
		}

		var finalHtml = `
			<!DOCTYPE html><html><head>
			<title>KILM Upcoming Enemy Match Statistics</title>
			<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
			<style>
			h1,h2,h3,h4,table,p {
				font-family: Helvetica;
			}
			table {
				border-collapse: collapse;
				width: 80%;
			}
			th {
				// text-align: left;
			}
			td, th {
				border: 1px solid #dddddd;
				padding: 8px;
				text-align: center;
			}
			  
			th {
				background-color: #b1b1b1;
			}
			</style>
			</head>
			<body>
				<h1>KILM Upcoming Enemy Match Statistics</h1>
				${html}
			</body>
			</html>
		
		`;

		console.log('Done!')

		res.send(finalHtml)
    } catch(err) {
        // We send critical errors as push
        console.log(err)
        // sendPush(err)
        process.exit(1)
    }
}

function upcomingEnemyTeams() {
	console.log('fetching upcoming matches')
    return new Promise((resolve, reject) => {
        
		const options = {
			url: 'https://app.esportligaen.dk/api/team/' + kilmTeamID + '?includeViewInfo=true'
		}

        request(options, function(error, response, body) {
			const json = JSON.parse(body)

			var upcomingEnemyTeams = {}
			for (const match of json.matches) {

				// Make sure we only get upcoming matches
				if (match.resultLocked === true) {
					continue
				}

				let enemyTeam

				for (const teamContainer of match.matchTeams) {
					if (teamContainer.team.id != kilmTeamID) {
						enemyTeam = teamContainer.team
					}
				}

				console.log('enemy team ' + enemyTeam)

				upcomingEnemyTeams[enemyTeam.id] = enemyTeam
			}

			resolve(upcomingEnemyTeams)
        })

    })
}

function pastMatches(teamID) {
	console.log('fetching team\'s (' + teamID+ ') past matches')
    return new Promise((resolve, reject) => {
        
		const options = {
			url: 'https://app.esportligaen.dk/api/team/' + teamID + '?includeViewInfo=true'
		}

        request(options, function(error, response, body) {
			const json = JSON.parse(body)

			var pastMatches = new Array()
			for (const match of json.matches) {

				// Make sure we only get past matches
				if (match.resultLocked === false) {
					continue
				}

				console.log('past match ' + match.id)

				pastMatches.push(match)
			}

			resolve(pastMatches)
        })

    })
}

function detailedMatchInfo(matchID) {
	console.log('fetching match info for ' + matchID)
    return new Promise((resolve, reject) => {
        
		const options = {
			url: 'https://app.esportligaen.dk/api/match/details/' + matchID
		}

        request(options, function(error, response, body) {
			const matchJSON = JSON.parse(body)

			console.log('detailed match info for ' + matchJSON.id)

			resolve(matchJSON)
        })

    })
}
