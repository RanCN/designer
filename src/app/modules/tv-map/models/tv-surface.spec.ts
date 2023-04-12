/*
 * Copyright Truesense AI Solutions Pvt Ltd, All Rights Reserved.
 */

import { TestBed } from '@angular/core/testing';
import { CatmullRomSpline } from 'app/core/shapes/catmull-rom-spline';
import { Vector2, Vector3 } from 'three';
import { TvSurface } from './tv-surface.model';
import { AnyControlPoint } from 'app/modules/three-js/objects/control-point';

describe( 'TvSurface', () => {

	let surface: TvSurface;

	it( 'should return correct values from toJson method', () => {

		const materialGuid = 'material-guid-123';

		const controlPointPositions = [
			new Vector3( 0, 0, 0 ),
			new Vector3( 1, 1, 0 ),
			new Vector3( 2, 2, 0 ),
		];

		const controlPoints = controlPointPositions.map( position => AnyControlPoint.create( '', position ) );

		const spline = new CatmullRomSpline( true, 'catmullrom', 0.5 );

		spline.addControlPoints( controlPoints );

		const offset = new Vector2( 10, 20 );
		const scale = new Vector2( 2, 3 );
		const rotation = 45;
		const height = 10;

		surface = new TvSurface( materialGuid, spline, offset, scale, rotation, height );

		const json = surface.toJson();

		expect( json.attr_height ).toEqual( height );
		expect( json.attr_rotation ).toEqual( rotation );
		expect( json.material.attr_guid ).toEqual( materialGuid );
		expect( json.offset.attr_x ).toEqual( offset.x );
		expect( json.offset.attr_y ).toEqual( offset.y );
		expect( json.scale.attr_x ).toEqual( scale.x );
		expect( json.scale.attr_y ).toEqual( scale.y );
		expect( json.spline.attr_type ).toEqual( spline.type );
		expect( json.spline.attr_closed ).toEqual( spline.closed );
		expect( json.spline.attr_tension ).toEqual( spline.tension );
		expect( json.spline.point.length ).toEqual( controlPointPositions.length );

		json.spline.point.forEach( ( point, index ) => {
			expect( point.attr_x ).toEqual( controlPointPositions[ index ].x );
			expect( point.attr_y ).toEqual( controlPointPositions[ index ].y );
		} );
	} );

} );
