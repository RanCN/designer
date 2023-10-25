/*
 * Copyright Truesense AI Solutions Pvt Ltd, All Rights Reserved.
 */

import { Injectable } from '@angular/core';
import { JunctionFactory } from 'app/factories/junction.factory';
import { RoadFactory } from 'app/factories/road-factory.service';
import { AppInspector } from 'app/core/inspector';
import { IFile } from 'app/io/file';
import { PropInstance } from 'app/core/models/prop-instance.model';
import { AbstractReader } from 'app/services/abstract-reader';
import { SceneService } from 'app/services/scene.service';
import { AbstractSpline } from 'app/core/shapes/abstract-spline';
import { AutoSpline } from 'app/core/shapes/auto-spline';
import { CatmullRomSpline } from 'app/core/shapes/catmull-rom-spline';
import { ExplicitSpline } from 'app/core/shapes/explicit-spline';
import { ToolManager } from 'app/tools/tool-manager';
import { readXmlArray, readXmlElement } from 'app/tools/xml-utils';
import { ScenarioEnvironment } from 'app/modules/scenario/models/actions/scenario-environment';
import { DynamicControlPoint } from 'app/modules/three-js/objects/dynamic-control-point';
import { RoadControlPoint } from 'app/modules/three-js/objects/road-control-point';
import { ThreeService } from 'app/modules/three-js/three.service';
import { TvMapBuilder } from 'app/modules/tv-map/builders/tv-map-builder';
import { TvAbstractRoadGeometry } from 'app/modules/tv-map/models/geometries/tv-abstract-road-geometry';
import { PropCurve } from 'app/modules/tv-map/models/prop-curve';
import { PropPolygon } from 'app/modules/tv-map/models/prop-polygons';
import {
	EnumHelper,
	ObjectTypes,
	TvColors,
	TvContactPoint,
	TvGeometryType,
	TvLaneSide,
	TvRoadMarkTypes,
	TvRoadMarkWeights,
	TvRoadType,
	TvUnit,
	TvUserData
} from 'app/modules/tv-map/models/tv-common';
import { TvControllerControl } from 'app/modules/tv-map/models/tv-controller';
import { TvJunction } from 'app/modules/tv-map/models/tv-junction';
import { TvJunctionConnection } from 'app/modules/tv-map/models/tv-junction-connection';
import { TvJunctionController } from 'app/modules/tv-map/models/tv-junction-controller';
import { TvJunctionLaneLink } from 'app/modules/tv-map/models/tv-junction-lane-link';
import { TvJunctionPriority } from 'app/modules/tv-map/models/tv-junction-priority';
import { TvLane } from 'app/modules/tv-map/models/tv-lane';
import { TvLaneSection } from 'app/modules/tv-map/models/tv-lane-section';
import { TvMap } from 'app/modules/tv-map/models/tv-map.model';
import { TvObjectMarking } from 'app/modules/tv-map/models/tv-object-marking';
import { TvPlaneView } from 'app/modules/tv-map/models/tv-plane-view';
import { TvRoadLinkChildType } from 'app/modules/tv-map/models/tv-road-link-child';
import { Crosswalk, TvCornerRoad, TvObjectOutline, TvRoadObject } from 'app/modules/tv-map/models/tv-road-object';
import { TvRoadSignal } from 'app/modules/tv-map/models/tv-road-signal.model';
import { TvRoadTypeClass } from 'app/modules/tv-map/models/tv-road-type.class';
import { TvRoad } from 'app/modules/tv-map/models/tv-road.model';
import { TvSurface } from 'app/modules/tv-map/models/tv-surface.model';
import { XmlElement } from 'app/modules/tv-map/services/open-drive-parser.service';
import { TvMapInstance } from 'app/modules/tv-map/services/tv-map-source-file';
import { SignShapeType } from 'app/modules/tv-map/services/tv-sign.service';
import { XMLParser } from 'fast-xml-parser';
import { Euler, Object3D, Vector2, Vector3 } from 'three';
import { AssetDatabase } from '../core/asset/asset-database';
import { FileService } from '../io/file.service';
import { TvConsole } from '../core/utils/console';
import { CommandHistory } from './command-history';
import { SnackBar } from './snack-bar.service';
import { TvElectronService } from './tv-electron.service';
import { TvLaneRoadMark } from 'app/modules/tv-map/models/tv-lane-road-mark';


@Injectable( {
	providedIn: 'root'
} )
export class SceneImporterService extends AbstractReader {

	constructor (
		private fileService: FileService,
		private electronService: TvElectronService,
		private threeService: ThreeService,
	) {
		super();
	}

	get map (): TvMap {
		return TvMapInstance.map;
	}

	set map ( value ) {
		TvMapInstance.map = value;
	}

	importFromPath ( path: string ) {

		try {

			this.fileService.readFile( path, 'scene', ( file ) => {

				this.importFromFile( file );

			} );

		} catch ( error ) {

			SnackBar.error( error );

		}

	}

	importFromFile ( file: IFile ): void {

		try {

			if ( this.importFromString( file.contents ) ) {

				TvMapInstance.currentFile = file;

				this.electronService.setTitle( file.name, file.path );

			}

		} catch ( error ) {

			SnackBar.error( error );

			console.error( error, file );

		}

	}

	importFromString ( contents: string ): boolean {

		const defaultOptions = {
			attributeNamePrefix: 'attr_',
			attrNodeName: false,
			textNodeName: 'value',
			ignoreAttributes: false,
			supressEmptyNode: false,
			format: true,
			allowBooleanAttributes: true
		};

		const parser = new XMLParser( defaultOptions );

		const scene: any = parser.parse( contents );

		// check for main elements first before parsing
		const version = scene.version;
		const guid = scene.guid;

		if ( !version ) SnackBar.error( 'Cannot read scene version. Please check scene file before importing', 'OK', 5000 );
		if ( !version ) console.error( 'Cannot read scene version', scene );
		if ( !version ) return;

		this.prepareToImport();

		this.importScene( scene );

		return true;
	}

	private prepareToImport () {

		ToolManager.clear();

		AppInspector.clear();

		CommandHistory.clear();

		this.map.destroy();

		this.map = new TvMap();

	}

	private importScene ( xml: XmlElement ): void {

		this.readAsOptionalArray( xml.road, xml => {

			this.map.addRoad( this.importRoad( xml ) );

		} );

		this.map.roads.forEach( road => {

			if ( road.isJunction ) {

				road.spline.controlPoints.forEach( ( cp: RoadControlPoint ) => cp.allowChange = false );

			}

			// if ( road.successor && road.successor.elementType === "road" ) {

			//     const successor = this.openDrive.getRoadById( road.successor.elementId );

			//     successor.updated.subscribe( i => road.onSuccessorUpdated( i ) );
			// }

			// if ( road.predecessor && road.predecessor.elementType === "road" ) {

			//     const predecessor = this.openDrive.getRoadById( road.predecessor.elementId );

			//     predecessor.updated.subscribe( i => road.onPredecessorUpdated( i ) );
			// }

		} );

		this.readAsOptionalArray( xml.prop, xml => {

			this.importProp( xml );

		} );

		this.readAsOptionalArray( xml.propCurve, xml => {

			this.map.propCurves.push( this.importPropCurve( xml ) );

		} );

		this.readAsOptionalArray( xml.propPolygon, xml => {

			this.map.propPolygons.push( this.importPropPolygon( xml ) );

		} );

		this.readAsOptionalArray( xml.surface, xml => {

			this.map.surfaces.push( this.importSurface( xml ) );

		} );

		this.readAsOptionalArray( xml.junction, xml => {

			const junction = this.parseJunction( xml );

			if ( xml.position ) {

				junction.position = new Vector3(
					parseFloat( xml.position.attr_x ),
					parseFloat( xml.position.attr_y ),
					parseFloat( xml.position.attr_z ),
				);
			}

			this.map.addJunctionInstance( junction );

		} );

		this.readEnvironment( xml.environment );

		this.map.roads.forEach( road => {

			TvMapBuilder.buildRoad( this.map.gameObject, road );

		} );

		SceneService.addToMain( this.map.gameObject );

	}

	private readEnvironment ( xml: XmlElement ) {

		let environment: ScenarioEnvironment;

		if ( !xml ) {

			environment = new ScenarioEnvironment( 'Default' );

		} else {

			environment = ScenarioEnvironment.import( xml );

		}

		this.threeService.setEnvironment( environment, true );

	}

	private importProp ( xml: XmlElement ) {

		const propObject = SceneImporterService.preparePropObject( xml );

		const propInstance = new PropInstance( xml.attr_guid, propObject );

		this.map.props.push( propInstance );

		SceneService.addToMain( propInstance );

	}

	private importRoad ( xml: XmlElement ): TvRoad {

		if ( !xml.spline ) throw new Error( 'Incorrect road' );

		const name = xml.attr_name || 'untitled';
		const length = parseFloat( xml.attr_length );
		const id = parseInt( xml.attr_id );
		const junction = parseInt( xml.attr_junction ) || -1;

		const road = RoadFactory.createNewRoad( name, length, id, junction );

		road.drivingMaterialGuid = xml.drivingMaterialGuid;
		road.sidewalkMaterialGuid = xml.sidewalkMaterialGuid;
		road.borderMaterialGuid = xml.borderMaterialGuid;
		road.shoulderMaterialGuid = xml.shoulderMaterialGuid;

		road.spline = this.importSpline( xml.spline, road );

		this.parseRoadTypes( road, xml );

		if ( xml.link != null ) this.parseRoadLinks( road, xml.link );

		if ( xml.elevationProfile != null ) this.parseElevationProfile( road, xml.elevationProfile );

		if ( xml.lateralProfile != null ) this.parseLateralProfile( road, xml.lateralProfile );

		if ( xml.lanes != null ) this.parseLanes( road, xml.lanes );

		if ( xml.objects != null && xml.objects !== '' ) this.parseObjects( road, xml.objects );

		// if ( xml.signals != null && xml.signals !== '' ) this.readSignals( road, xml.signals );

		// if ( xml.surface != null && xml.surface !== '' ) this.readSurface( road, xml.surface );

		return road;
	}

	private importSurface ( xml: XmlElement ): TvSurface {

		const height = parseFloat( xml.attr_height ) || 0.0;

		const rotation = parseFloat( xml.attr_rotation ) || 0.0;

		const material = xml.material.attr_guid || 'grass';

		const offset = new Vector2(
			parseFloat( xml.offset.attr_x ),
			parseFloat( xml.offset.attr_y ),
		);

		const scale = new Vector2(
			parseFloat( xml.scale.attr_x ),
			parseFloat( xml.scale.attr_y ),
		);

		const spline = this.importCatmullSpline( xml.spline );

		const surface = new TvSurface( material, spline, offset, scale, rotation, height );

		spline.controlPoints.forEach( p => p.mainObject = surface );

		return surface;
	}

	private importSpline ( xml: XmlElement, road: TvRoad ): AbstractSpline {

		const type = xml.attr_type;

		if ( type === 'auto' ) {

			const spline = this.importAutoSpline( xml, road );

			road.updateGeometryFromSpline();

			return spline;

		} else if ( type === 'explicit' ) {

			const spline = road.spline = this.importExplicitSpline( xml, road );

			road.updateGeometryFromSpline( true );

			return spline;

		} else {

			throw new Error( 'unknown spline type' );

		}

	}

	private importExplicitSpline ( xml: XmlElement, road: TvRoad ): ExplicitSpline {

		const spline = road.spline = new ExplicitSpline( road );

		let index = 0;

		this.readAsOptionalArray( xml.point, xml => {

			const position = new Vector3(
				parseFloat( xml.attr_x ),
				parseFloat( xml.attr_y ),
				parseFloat( xml.attr_z ),
			);

			const hdg = parseFloat( xml.attr_hdg );

			const segType = +xml.attr_type;

			spline.addFromFile( index, position, hdg, segType );

			index++;

		} );

		// to not show any lines or control points
		spline.hide();

		return spline;
	}

	private importAutoSpline ( xml, road: TvRoad ): AutoSpline {

		const spline = road.spline as AutoSpline;

		this.readAsOptionalArray( xml.point, xml => {

			const position = this.importVector3( xml );

			SceneService.addToMain( spline.addControlPointAt( position ) );

		} );

		// to not show any lines or control points
		spline.hide();

		return spline;
	}

	private importCatmullSpline ( xml: XmlElement, mainObject?: any ): CatmullRomSpline {

		const type = xml.attr_type || 'catmullrom';
		const closed = xml.attr_closed === 'true';
		const tension = parseFloat( xml.attr_tension ) || 0.5;

		const spline = new CatmullRomSpline( closed, type, tension );

		this.readAsOptionalArray( xml.point, xml => {

			const position = this.importVector3( xml );

			const controlPoint = new DynamicControlPoint( mainObject, position );

			spline.addControlPoint( controlPoint );

			SceneService.addToMain( controlPoint );

		} );

		// to make the line and other calculations
		spline.update();

		// to not show any lines or control points
		spline.hide();

		return spline;
	}

	private importVector3 ( xml: XmlElement ): Vector3 {

		return new Vector3(
			parseFloat( xml.attr_x ),
			parseFloat( xml.attr_y ),
			parseFloat( xml.attr_z ),
		);

	}

	private importPropCurve ( xml: XmlElement ): PropCurve {

		const guid = xml.attr_guid;

		const meta = AssetDatabase.getMetadata( guid );

		if ( !meta ) return;

		const spline = this.importCatmullSpline( xml.spline );
		const reverse = xml.attr_reverse === 'true' ? true : false;
		const rotation = parseFloat( xml.attr_rotation ) || 0;
		const spacing = parseFloat( xml.attr_spacing ) || 5;
		const positionVariance = parseFloat( xml.attr_positionVariance ) || 0;

		const curve = new PropCurve( guid, spline, spacing, rotation, positionVariance, reverse );

		spline.controlPoints.forEach( p => p.mainObject = curve );

		this.readAsOptionalArray( xml.props, propXml => {

			const instance = AssetDatabase.getInstance( propXml.attr_guid ) as Object3D;

			const prop = instance.clone();

			const position = this.importVector3( propXml?.position );

			const rotation = this.importVector3( propXml?.rotation );

			const scale = this.importVector3( propXml?.scale );

			curve.addProp( prop, position, rotation, scale );

		} );

		return curve;
	}

	private importPropPolygon ( xml: XmlElement ): PropPolygon {

		const guid = xml.attr_guid;

		const density = parseFloat( xml.attr_density ) || 0.5;

		const metadata = AssetDatabase.getMetadata( guid );

		if ( !metadata ) return;

		const spline = this.importCatmullSpline( xml.spline );

		const polygon = new PropPolygon( guid, spline, density );

		spline.controlPoints.forEach( p => p.mainObject = p.userData.polygon = polygon );

		this.readAsOptionalArray( xml.props, propXml => {

			const propObject = SceneImporterService.preparePropObject( propXml );

			polygon.addPropObject( propObject );

			SceneService.addToMain( propObject );

		} );

		SceneService.addToMain( polygon.mesh );

		return polygon;
	}

	private static preparePropObject ( xml: XmlElement ): Object3D {

		const instance = AssetDatabase.getInstance<Object3D>( xml.attr_guid );

		if ( !instance ) TvConsole.error( `Object not found` );

		if ( !instance ) return;

		const prop = instance.clone();

		const position = new Vector3(
			parseFloat( xml.position.attr_x ),
			parseFloat( xml.position.attr_y ),
			parseFloat( xml.position.attr_z ),
		);

		const rotation = new Euler(
			parseFloat( xml.rotation.attr_x ),
			parseFloat( xml.rotation.attr_y ),
			parseFloat( xml.rotation.attr_z ),
		);

		const scale = new Vector3(
			parseFloat( xml.scale.attr_x ),
			parseFloat( xml.scale.attr_y ),
			parseFloat( xml.scale.attr_z ),
		);

		prop.position.copy( position );

		prop.rotation.copy( rotation );

		prop.scale.copy( scale );

		return prop;
	}

	private makeSplineFromGeometry ( road: TvRoad, geometries: TvAbstractRoadGeometry[] ): ExplicitSpline {

		const spline = new ExplicitSpline( road );

		if ( geometries.length === 0 ) return spline;

		let lastGeometry: TvAbstractRoadGeometry;

		for ( let i = 0; i < geometries.length; i++ ) {

			lastGeometry = geometries[ i ];

			spline.addFromFile( i, lastGeometry.startV3, lastGeometry.hdg, lastGeometry.geometryType, lastGeometry );
		}

		const lastCoord = lastGeometry.endCoord();

		spline.addFromFile( geometries.length, lastCoord.toVector3(), lastCoord.hdg, lastGeometry.geometryType, lastGeometry );

		spline.hide();

		spline.controlPoints.forEach( cp => cp.userData.roadId = road.id );

		return spline;
	}

	private parseRoadLinks ( road: TvRoad, xmlElement: XmlElement ) {

		if ( xmlElement.predecessor != null ) {

			this.parseRoadLink( road, xmlElement.predecessor, 0 );

		}

		if ( xmlElement.successor != null ) {

			this.parseRoadLink( road, xmlElement.successor, 1 );

		}

		if ( xmlElement.neighbor != null ) {

			if ( Array.isArray( xmlElement.neighbor ) ) {

				for ( let i = 0; i < xmlElement.neighbor.length; i++ ) {

					this.parseRoadLink( road, xmlElement.neighbor[ i ], 2 );

				}

			} else {

				this.parseRoadLink( road, xmlElement.neighbor, 2 );

			}
		}
	}

	private parseRoadLink ( road: TvRoad, xmlElement: XmlElement, type: number ) {

		if ( type === 0 ) {

			const elementType = this.parseElementType( xmlElement.attr_elementType );
			const elementId = parseFloat( xmlElement.attr_elementId );
			const contactPoint = this.parseContactPoint( xmlElement.attr_contactPoint );


			road.setPredecessor( elementType, elementId, contactPoint );

		} else if ( type === 1 ) {

			const elementType = this.parseElementType( xmlElement.attr_elementType );
			const elementId = parseFloat( xmlElement.attr_elementId );
			const contactPoint = this.parseContactPoint( xmlElement.attr_contactPoint );

			road.setSuccessor( elementType, elementId, contactPoint );

		} else if ( type === 2 ) {

			console.error( 'neighbour not supported' );

			// const side = xmlElement.attr_side;
			// const elementId = xmlElement.attr_elementId;
			// const direction = xmlElement.attr_direction;
			//
			// road.setNeighbor( side, elementId, direction );

		}

	}

	private parseElementType ( value: string ): TvRoadLinkChildType {

		if ( value === 'road' ) {

			return TvRoadLinkChildType.road;

		} else if ( value === 'junction' ) {

			return TvRoadLinkChildType.junction;

		} else {

			return null;

		}

	}

	private parseContactPoint ( value: string ): TvContactPoint {

		if ( value === 'start' ) {

			return TvContactPoint.START;

		} else if ( value === 'end' ) {

			return TvContactPoint.END;

		} else {

			return null;

		}

	}

	private parseRoadTypes ( road: TvRoad, xmlElement: XmlElement ) {

		// if ( !xmlElement.type ) console.warn( 'no road type tag not present' );

		readXmlArray( xmlElement.type, ( xml: XmlElement ) => {

			const s = parseFloat( xml.attr_s );

			const roadType = TvRoadTypeClass.stringToTypes( xml.attr_type );

			let maxSpeed = 0;

			let unit = TvUnit.MILES_PER_HOUR;

			readXmlElement( xml.speed, xml => {

				maxSpeed = parseFloat( xml.attr_max );

				unit = EnumHelper.stringToOdUnits( xml.attr_unit );

			} );

			road.type.push( new TvRoadTypeClass( s, roadType, maxSpeed, unit ) );

		} );

		// add default if no road type inserted
		if ( road.type.length === 0 ) {

			road.setType( TvRoadType.TOWN, 40, TvUnit.MILES_PER_HOUR );

		}

	}

	private parsePlanView ( road: TvRoad, xmlElement: XmlElement ) {

		if ( xmlElement.geometry != null ) {

			if ( Array.isArray( xmlElement.geometry ) ) {

				for ( let i = 0; i < xmlElement.geometry.length; i++ ) {

					this.parseGeometryType( road, xmlElement.geometry[ i ] );

				}

			} else {

				this.parseGeometryType( road, xmlElement.geometry );

			}

		} else {

			SnackBar.error( 'No geometry found for road:' + road.id + '. Adding default line with length 1' );

			road.addGeometryLine( 0, 0, 0, 0, Math.max( road.length, 1 ) );

		}
	}

	private parseGeometryType ( road: TvRoad, xmlElement: XmlElement ) {

		if ( xmlElement.line != null ) {

			this.parseGeometryBlock( road, xmlElement, TvGeometryType.LINE );

		} else if ( xmlElement.arc != null ) {

			this.parseGeometryBlock( road, xmlElement, TvGeometryType.ARC );

		} else if ( xmlElement.spiral != null ) {

			this.parseGeometryBlock( road, xmlElement, TvGeometryType.SPIRAL );

		} else if ( xmlElement.poly3 != null ) {

			this.parseGeometryBlock( road, xmlElement, TvGeometryType.POLY3 );

		} else if ( xmlElement.paramPoly3 != null ) {

			this.parseGeometryBlock( road, xmlElement, TvGeometryType.PARAMPOLY3 );

		} else {

			console.error( 'unknown geometry type', xmlElement );

		}
	}

	private parseGeometryBlock ( road: TvRoad, xmlElement: XmlElement, geometryType: TvGeometryType ) {

		const s = parseFloat( xmlElement.attr_s );
		const x = parseFloat( xmlElement.attr_x );
		const y = parseFloat( xmlElement.attr_y );
		const hdg = parseFloat( xmlElement.attr_hdg );
		const length = parseFloat( xmlElement.attr_length );

		road.addPlanView();

		const planView = road.getPlanView();

		this.parseGeometry( planView, xmlElement, geometryType );
	}

	private parseGeometry ( planView: TvPlaneView, xmlElement: XmlElement, geometryType: TvGeometryType ) {

		const s = parseFloat( xmlElement.attr_s );
		const x = parseFloat( xmlElement.attr_x );
		const y = parseFloat( xmlElement.attr_y );
		let hdg = parseFloat( xmlElement.attr_hdg );
		const length = parseFloat( xmlElement.attr_length );

		// unsure of this, but works well so far
		// hdg += Maths.M_PI_2;

		// NO NEED FOR THIS
		// because of threejs co-ordinate system
		// x will become y and y will become x
		// const x = parsedX * -1;
		// const y = parsedY;

		switch ( geometryType ) {

			case TvGeometryType.LINE:

				planView.addGeometryLine( s, x, y, hdg, length );

				break;

			case TvGeometryType.SPIRAL:

				const curvStart = parseFloat( xmlElement.spiral.attr_curvStart );
				const curvEnd = parseFloat( xmlElement.spiral.attr_curvEnd );

				planView.addGeometrySpiral( s, x, y, hdg, length, curvStart, curvEnd );

				break;

			case TvGeometryType.ARC:

				const curvature = parseFloat( xmlElement.arc.attr_curvature );

				planView.addGeometryArc( s, x, y, hdg, length, curvature );

				break;

			case TvGeometryType.POLY3:

				const a = parseFloat( xmlElement.poly3.attr_a );
				const b = parseFloat( xmlElement.poly3.attr_b );
				const c = parseFloat( xmlElement.poly3.attr_c );
				const d = parseFloat( xmlElement.poly3.attr_d );

				planView.addGeometryPoly3( s, x, y, hdg, length, a, b, c, d );

				break;

			case TvGeometryType.PARAMPOLY3:

				const aU = parseFloat( xmlElement.paramPoly3.attr_aU );
				const bU = parseFloat( xmlElement.paramPoly3.attr_bU );
				const cU = parseFloat( xmlElement.paramPoly3.attr_cU );
				const dU = parseFloat( xmlElement.paramPoly3.attr_dU );

				const aV = parseFloat( xmlElement.paramPoly3.attr_aV );
				const bV = parseFloat( xmlElement.paramPoly3.attr_bV );
				const cV = parseFloat( xmlElement.paramPoly3.attr_cV );
				const dV = parseFloat( xmlElement.paramPoly3.attr_dV );

				planView.addGeometryParamPoly3( s, x, y, hdg, length, aU, bU, cU, dU, aV, bV, cV, dV );

				break;

			default:
				console.error( 'unknown geometry type', geometryType );
				break;

		}

	}

	private parseJunction ( xmlElement: XmlElement ): TvJunction {

		const name = xmlElement.attr_name;
		const id = parseInt( xmlElement.attr_id );

		const junction = JunctionFactory.createJunction( name, id );

		readXmlArray( xmlElement.connection, xml => {

			junction.addConnection( this.parseJunctionConnection( xml, junction ) );

		} );

		readXmlArray( xmlElement.priority, xml => {

			junction.addPriority( this.parseJunctionPriority( xml ) );

		} );

		readXmlArray( xmlElement.controller, xml => {

			junction.addController( this.parseJunctionController( xml ) );

		} );

		return junction;
	}

	private parseJunctionConnection ( xmlElement: XmlElement, junction: TvJunction ) {

		const id = parseInt( xmlElement.attr_id );
		const incomingRoadId = parseInt( xmlElement.attr_incomingRoad );
		const connectingRoadId = parseInt( xmlElement.attr_connectingRoad );
		const contactPoint = this.parseContactPoint( xmlElement.attr_contactPoint );

		const incomingRoad = this.map.getRoadById( incomingRoadId );
		const connectingRoad = this.map.getRoadById( connectingRoadId );

		const outgoingRoadId = contactPoint == TvContactPoint.START ?
			connectingRoad?.successor?.elementId :
			connectingRoad?.predecessor?.elementId;

		const outgoingRoad = outgoingRoadId ? this.map.getRoadById( outgoingRoadId ) : null;

		if ( !outgoingRoad ) console.warn( 'outgoingRoad', outgoingRoad, connectingRoad );

		const connection = new TvJunctionConnection( id, incomingRoad, connectingRoad, contactPoint, outgoingRoad );

		readXmlArray( xmlElement.laneLink, xml => {

			connection.addLaneLink( this.parseJunctionConnectionLaneLink( xml, junction, connection ) );

		} );

		return connection;
	}

	private parseJunctionConnectionLaneLink ( xmlElement: XmlElement, junction: TvJunction, connection: TvJunctionConnection ): TvJunctionLaneLink {

		const from = parseInt( xmlElement.attr_from );
		const to = parseInt( xmlElement.attr_to );

		return connection.makeLaneLink( junction, from, to );
	}

	private parseJunctionPriority ( xmlElement: XmlElement ): TvJunctionPriority {

		const high = parseInt( xmlElement.attr_high );
		const low = parseInt( xmlElement.attr_low );

		return new TvJunctionPriority( high, low );
	}

	private parseJunctionController ( xmlElement: XmlElement ): TvJunctionController {

		const id = parseInt( xmlElement.attr_id );
		const type = xmlElement.attr_type;
		const sequence = parseInt( xmlElement.attr_sequence );

		return new TvJunctionController( id, type, sequence );
	}

	private parseElevationProfile ( road: TvRoad, xmlElement: XmlElement ) {

		road.addElevationProfile();

		readXmlArray( xmlElement.elevation, ( xml: XmlElement ) => {

			const s = parseFloat( xml.attr_s );
			const a = parseFloat( xml.attr_a );
			const b = parseFloat( xml.attr_b );
			const c = parseFloat( xml.attr_c );
			const d = parseFloat( xml.attr_d );

			road.addElevation( s, a, b, c, d );

		} );

	}

	private parseLateralProfile ( road: TvRoad, xmlElement: XmlElement ) {

	}

	private parseLanes ( road: TvRoad, xmlElement: XmlElement ) {

		readXmlArray( xmlElement.laneSection, ( xml ) => {

			this.parseLaneSection( road, xml );

		} );

		readXmlArray( xmlElement.laneOffset, ( xml ) => {

			this.parseLaneOffset( road, xml );

		} );


		// if ( xmlElement.laneSection != null ) {
		//
		//     if ( Array.isArray( xmlElement.laneSection ) ) {
		//
		//         for ( let i = 0; i < xmlElement.laneSection.length; i++ ) {
		//
		//             this.parseLaneSections( road, xmlElement.laneSection[i] );
		//
		//         }
		//
		//     } else {
		//
		//         this.parseLaneSections( road, xmlElement.laneSection );
		//
		//     }
		// }
	}

	private parseObjects ( road: TvRoad, xmlElement: XmlElement ) {

		// @ts-ignore
		if ( xmlElement != null && xmlElement !== '' ) {

			if ( Array.isArray( xmlElement.object ) ) {

				for ( let i = 0; i < xmlElement.object.length; i++ ) {

					this.parseObject( road, xmlElement.object[ i ] );

				}
			} else {

				this.parseObject( road, xmlElement.object );

			}
		}
	}

	private parseObject ( road: TvRoad, xmlElement: XmlElement ) {

		const type = xmlElement.attr_type;
		const name = xmlElement.attr_name;
		const id = parseFloat( xmlElement.attr_id ) || 0;
		const s = parseFloat( xmlElement.attr_s ) || 0;
		const t = parseFloat( xmlElement.attr_t ) || 0;
		const zOffset = parseFloat( xmlElement.attr_zOffset ) || 0.005;
		const validLength = parseFloat( xmlElement.attr_validLength ) || 0;
		const orientation = xmlElement.attr_orientation;
		const length = parseFloat( xmlElement.attr_length ) || 0;
		const width = parseFloat( xmlElement.attr_width ) || 0;
		const radius = parseFloat( xmlElement.attr_radius ) || 0;
		const height = parseFloat( xmlElement.attr_height ) || 0;
		const hdg = parseFloat( xmlElement.attr_hdg ) || 0;
		const pitch = parseFloat( xmlElement.attr_pitch ) || 0;
		const roll = parseFloat( xmlElement.attr_roll ) || 0;

		const outlines: TvObjectOutline[] = [];
		const markings: TvObjectMarking[] = [];

		readXmlArray( xmlElement.outlines?.outline, xml => {
			outlines.push( this.parseObjectOutline( xml, road ) );
		} );

		readXmlArray( xmlElement.markings?.marking, xml => {
			markings.push( this.parseObjectMarking( xml, road ) );
		} );


		if ( type == ObjectTypes.crosswalk ) {

			const crosswalk = new Crosswalk( s, t, markings, outlines );

			markings.forEach( marking => marking.roadObject = crosswalk );

			crosswalk.update();

			SceneService.addToMain( crosswalk );

			road.addRoadObjectInstance( crosswalk );

		} else {

			road.addRoadObject(
				type, name, id,
				s, t, zOffset,
				validLength,
				orientation,
				length, width, radius, height,
				hdg, pitch, roll
			);

		}

		const roadObject = road.getLastAddedRoadObject();

		roadObject.userData = this.parseUserData( xmlElement );

		this.parseRoadObjectRepeatArray( roadObject, xmlElement );
	}

	private parseObjectMarking ( xml: XmlElement, road: TvRoad ): TvObjectMarking {

		const color = xml.attr_color;
		const spaceLength = parseFloat( xml.attr_spaceLength );
		const lineLength = parseFloat( xml.attr_lineLength );
		const side = xml.attr_side;
		const weight = xml.attr_weight;
		const startOffset = parseFloat( xml.attr_startOffset );
		const stopOffset = parseFloat( xml.attr_stopOffset );
		const zOffset = parseFloat( xml.attr_zOffset );
		const width = parseFloat( xml.attr_width );

		const marking = new TvObjectMarking( color, spaceLength, lineLength, side, weight, startOffset, stopOffset, zOffset, width );

		if ( xml.attr_materialGuid ) marking.materialGuid = xml.attr_materialGuid;

		readXmlArray( xml.cornerReference, xml => {
			marking.cornerReferences.push( parseFloat( xml.attr_id ) );
		} );

		return marking;
	}

	private parseObjectOutline ( xml: XmlElement, road: TvRoad ): TvObjectOutline {

		const outline = new TvObjectOutline();

		outline.id = parseFloat( xml.attr_id ) || 0;

		readXmlArray( xml.cornerRoad, xml =>
			outline.cornerRoad.push( this.parseCornerRoad( xml, road ) )
		);

		return outline;
	}

	private parseCornerRoad ( xml: XmlElement, road: TvRoad ): TvCornerRoad {

		const id = parseFloat( xml.attr_id );
		const s = parseFloat( xml.attr_s );
		const t = parseFloat( xml.attr_t );
		const dz = parseFloat( xml.attr_dz );
		const height = parseFloat( xml.attr_height );

		const corner = new TvCornerRoad( id, road, s, t, dz, height );

		corner.hide();	// by default we want to hide corner points during import

		return corner;
	}

	private parseRoadObjectRepeatArray ( roadObject: TvRoadObject, xmlElement: XmlElement ): void {

		if ( xmlElement.repeat != null && xmlElement.repeat !== '' ) {

			if ( Array.isArray( xmlElement.repeat ) ) {

				for ( let i = 0; i < xmlElement.repeat.length; i++ ) {

					this.parseRoadObjectRepeat( roadObject, xmlElement.repeat[ i ] );

				}

			} else {

				this.parseRoadObjectRepeat( roadObject, xmlElement );

			}

		}

	}

	private parseRoadObjectRepeat ( roadObject: TvRoadObject, xmlElement: XmlElement ): void {

		const s = parseFloat( xmlElement.attr_s );
		const length = parseFloat( xmlElement.attr_length );
		const distance = parseFloat( xmlElement.attr_distance );
		const tStart = parseFloat( xmlElement.attr_tStart );
		const tEnd = parseFloat( xmlElement.attr_tEnd );
		const widthStart = parseFloat( xmlElement.attr_widthStart );
		const widthEnd = parseFloat( xmlElement.attr_widthEnd );
		const heightStart = parseFloat( xmlElement.attr_heightStart );
		const heightEnd = parseFloat( xmlElement.attr_heightEnd );
		const zOffsetStart = parseFloat( xmlElement.attr_zOffsetStart );
		const zOffsetEnd = parseFloat( xmlElement.attr_zOffsetEnd );

		roadObject.addRepeat( s, length, distance, tStart, tEnd, widthStart, widthEnd, heightStart, heightEnd, zOffsetStart, zOffsetEnd );

	}

	private parseSignals ( road: TvRoad, xmlElement: XmlElement ) {

		readXmlArray( xmlElement.signal, x => this.parseSignal( road, x ) );

	}

	private parseSignal ( road: TvRoad, xmlElement: XmlElement ) {

		const s = parseFloat( xmlElement.attr_s );
		const t = xmlElement.attr_t;
		const id = xmlElement.attr_id;
		const name = xmlElement.attr_name;
		const dynamic = xmlElement.attr_dynamic;
		const orientation = xmlElement.attr_orientation;
		const zOffset = xmlElement.attr_zOffset;
		const country = xmlElement.attr_country;
		const type = xmlElement.attr_type;
		const subtype = xmlElement.attr_subtype;
		const value = xmlElement.attr_value;
		const unit = xmlElement.attr_unit;
		const height = xmlElement.attr_height;
		const width = xmlElement.attr_width;
		const text = xmlElement.attr_text;
		const hOffset = xmlElement.attr_hOffset;
		const pitch = xmlElement.attr_pitch;
		const roll = xmlElement.attr_roll;

		const roadSignal = road.addRoadSignal( s,
			t,
			id,
			name,
			dynamic,
			orientation,
			zOffset,
			country,
			type,
			subtype,
			value,
			unit,
			height,
			width,
			text,
			hOffset,
			pitch,
			roll
		);

		this.parseSignalValidity( roadSignal, xmlElement );

		this.parseSignalDependency( roadSignal, xmlElement );

		roadSignal.userData = this.parseUserData( xmlElement );

		if ( roadSignal.userDataMap.has( 'sign_shape' ) ) {

			const signShape = roadSignal.userDataMap.get( 'sign_shape' );

			roadSignal.signShape = SignShapeType[ signShape.attr_value ] as SignShapeType;

		}
	}

	private parseSignalValidity ( signal: TvRoadSignal, xmlElement: XmlElement ): void {

		if ( xmlElement.validity != null && xmlElement.validity !== '' ) {

			if ( Array.isArray( xmlElement.validity ) ) {

				for ( let i = 0; i < xmlElement.validity.length; i++ ) {

					const validity = xmlElement.validity[ i ];

					signal.addValidity( parseFloat( validity.attr_fromLane ), parseFloat( validity.attr_toLane ) );

				}

			} else {

				const validity = xmlElement.validity;

				signal.addValidity( parseFloat( validity.attr_fromLane ), parseFloat( validity.attr_toLane ) );

			}
		}
	}

	private parseSignalDependency ( signal: TvRoadSignal, xmlElement: XmlElement ): void {

		if ( xmlElement.dependency != null && xmlElement.dependency !== '' ) {

			if ( Array.isArray( xmlElement.dependency ) ) {

				for ( let i = 0; i < xmlElement.dependency.length; i++ ) {

					const dependency = xmlElement.dependency[ i ];

					signal.addDependency( parseFloat( dependency.attr_id ), dependency.attr_type );

				}

			} else {

				const dependency = xmlElement.dependency;

				signal.addDependency( parseFloat( dependency.attr_id ), dependency.attr_type );

			}
		}
	}

	private parseSurface ( road: TvRoad, xmlElement: XmlElement ) {

	}

	private parseLaneSection ( road: TvRoad, xmlElement: XmlElement ) {

		const s = parseFloat( xmlElement.attr_s );
		const singleSide = xmlElement.attr_singleSide == 'true';

		road.addLaneSection( s, singleSide );

		const laneSection = road.getLastAddedLaneSection();

		readXmlElement( xmlElement.left, xml => {
			readXmlArray( xml.lane, xml => {
				this.parseLane( laneSection, xml, TvLaneSide.LEFT );
			} );
		} );

		readXmlElement( xmlElement.center, xml => {
			readXmlArray( xml.lane, xml => {
				this.parseLane( laneSection, xml, TvLaneSide.CENTER );
			} );
		} );

		readXmlElement( xmlElement.right, xml => {
			readXmlArray( xml.lane, xml => {
				this.parseLane( laneSection, xml, TvLaneSide.RIGHT );
			} );
		} );

	}

	private parseLane ( laneSection: TvLaneSection, xmlElement: XmlElement, laneSide: TvLaneSide ) {

		const id = parseFloat( xmlElement.attr_id );
		const type = xmlElement.attr_type;
		const level = xmlElement.attr_level == 'true';

		const lane = laneSection.addLane( laneSide, id, type, level, false );

		if ( xmlElement.attr_materialGuid ) {
			lane.threeMaterialGuid = xmlElement.attr_materialGuid;
		}

		if ( xmlElement.link != null ) {

			const predecessorXml = xmlElement.link.predecessor;
			const successorXml = xmlElement.link.successor;

			if ( predecessorXml != null ) {

				lane.setPredecessor( parseInt( predecessorXml.attr_id ) );

			}

			if ( successorXml != null ) {

				lane.setSuccessor( parseInt( successorXml.attr_id ) );

			}
		}

		//  Read Width
		readXmlArray( xmlElement.width, xml => this.parseLaneWidth( lane, xml ) );

		//  Read RoadMark
		readXmlArray( xmlElement.roadMark, xml => lane.addRoadMarkInstance( this.parseLaneRoadMark( lane, xml ) ) );

		//  Read material
		readXmlArray( xmlElement.material, xml => this.parseLaneMaterial( lane, xml ) );

		//  Read visibility
		readXmlArray( xmlElement.visibility, xml => this.parseLaneVisibility( lane, xml ) );

		//  Read speed
		readXmlArray( xmlElement.speed, xml => this.parseLaneSpeed( lane, xml ) );

		//  Read access
		readXmlArray( xmlElement.access, xml => this.parseLaneAccess( lane, xml ) );

		//  Read height
		readXmlArray( xmlElement.height, xml => this.parseLaneHeight( lane, xml ) );

	}

	private parseLaneWidth ( lane: TvLane, xmlElement: XmlElement ) {

		const sOffset = parseFloat( xmlElement.attr_sOffset );

		const a = parseFloat( xmlElement.attr_a );
		const b = parseFloat( xmlElement.attr_b );
		const c = parseFloat( xmlElement.attr_c );
		const d = parseFloat( xmlElement.attr_d );

		lane.addWidthRecord( sOffset, a, b, c, d );

	}

	private parseLaneRoadMark ( lane: TvLane, xmlElement: XmlElement ) {

		const sOffset = parseFloat( xmlElement.attr_sOffset ) || 0;
		const type = xmlElement.attr_type || TvRoadMarkTypes.SOLID;
		const weight = xmlElement.attr_weight || TvRoadMarkWeights.STANDARD;
		const color = xmlElement.attr_color || TvColors.STANDARD;
		const width = parseFloat( xmlElement.attr_width ) || 0.3;
		const laneChange = xmlElement.attr_laneChange;
		const height = parseFloat( xmlElement.attr_height ) || 0;
		const length = parseFloat( xmlElement.attr_length ) || 3.0;
		const space = parseFloat( xmlElement.attr_space ) || 0;
		const materialGuid = xmlElement.attr_materialGuid;

		return new TvLaneRoadMark( sOffset, type, weight, color, width, laneChange, height, lane, length, space, materialGuid )

	}

	private parseLaneMaterial ( lane: TvLane, xmlElement: XmlElement ) {

		const sOffset = parseFloat( xmlElement.attr_sOffset );
		const surface = xmlElement.attr_surface;
		const friction = parseFloat( xmlElement.attr_friction );
		const roughness = parseFloat( xmlElement.attr_roughness );

		lane.addMaterialRecord( sOffset, surface, friction, roughness );

	}

	private parseLaneVisibility ( lane: TvLane, xmlElement: XmlElement ) {

		const sOffset = parseFloat( xmlElement.attr_sOffset );
		const forward = parseFloat( xmlElement.attr_forward );
		const back = parseFloat( xmlElement.attr_back );
		const left = parseFloat( xmlElement.attr_left );
		const right = parseFloat( xmlElement.attr_right );

		lane.addVisibilityRecord( sOffset, forward, back, left, right );

	}

	private parseLaneSpeed ( lane: TvLane, xmlElement: XmlElement ) {

		const sOffset = parseFloat( xmlElement.attr_sOffset );
		const max = parseFloat( xmlElement.attr_max );
		const unit = xmlElement.attr_unit;

		lane.addSpeedRecord( sOffset, max, unit );

	}

	private parseLaneAccess ( lane: TvLane, xmlElement: XmlElement ) {

		const sOffset = parseFloat( xmlElement.attr_sOffset );
		const restriction = xmlElement.attr_restriction;

		lane.addAccessRecord( sOffset, restriction );

	}

	private parseLaneHeight ( lane: TvLane, xmlElement: XmlElement ) {

		const sOffset = parseFloat( xmlElement.attr_sOffset );
		const inner = parseFloat( xmlElement.attr_inner );
		const outer = parseFloat( xmlElement.attr_outer );

		lane.addHeightRecord( sOffset, inner, outer );

	}

	private parseUserData ( xmlElement: XmlElement ): TvUserData[] {

		const response: TvUserData[] = [];

		if ( xmlElement.userData != null ) {

			if ( Array.isArray( xmlElement.userData ) ) {

				for ( let i = 0; i < xmlElement.userData.length; i++ ) {

					const userData = xmlElement.userData[ i ];

					response.push( new TvUserData( userData.attr_code, userData.attr_value ) );

				}

			} else {

				response.push( new TvUserData( xmlElement.userData.attr_code, xmlElement.userData.attr_value ) );

			}

		}

		return response;

	}

	private parseLaneOffset ( road: TvRoad, xml: XmlElement ) {

		const s = parseFloat( xml.attr_s );
		const a = parseFloat( xml.attr_a );
		const b = parseFloat( xml.attr_b );
		const c = parseFloat( xml.attr_c );
		const d = parseFloat( xml.attr_d );

		road.addLaneOffset( s, a, b, c, d );
	}

	private parseControl ( xml: XmlElement ): TvControllerControl {

		const signalId = parseFloat( xml.attr_signalId );
		const type = xml.attr_type;

		return new TvControllerControl( signalId, type );
	}
}
