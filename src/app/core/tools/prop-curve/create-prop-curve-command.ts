/*
 * Copyright Truesense AI Solutions Pvt Ltd, All Rights Reserved.
 */

import { SelectPointCommand } from 'app/core/commands/select-point-command';
import { BaseControlPoint } from 'app/modules/three-js/objects/control-point';
import { PropCurve } from 'app/modules/tv-map/models/prop-curve';
import {
	PropCurveInspectorComponent,
	PropCurveInspectorData
} from 'app/views/inspectors/prop-curve-inspector/prop-curve-inspector.component';
import { BaseCommand } from '../../commands/base-command';
import { PropModel } from '../../models/prop-model.model';
import { SceneService } from '../../services/scene.service';
import { PropCurveToolV2 } from './prop-curve-tool';

export class CreatePropCurveCommand extends BaseCommand {

	private curve: PropCurve;

	private selectPointCommand: SelectPointCommand;

	constructor ( private tool: PropCurveToolV2, private prop: PropModel, private point: BaseControlPoint ) {

		super();

		this.curve = new PropCurve( this.prop.guid );

		point.mainObject = this.curve;

		const data = new PropCurveInspectorData( this.point, this.curve );

		this.selectPointCommand = new SelectPointCommand( this.tool as PropCurveToolV2, this.point, PropCurveInspectorComponent, data );
	}

	execute (): void {

		this.selectPointCommand.execute();

		this.map.propCurves.push( this.curve );

		this.curve.addControlPoint( this.point );

		SceneService.add( this.point );

		this.curve.show();

	}

	undo (): void {

		this.selectPointCommand.undo();

		this.curve.delete();

		SceneService.remove( this.point );

		const index = this.map.propCurves.indexOf( this.curve );

		this.map.propCurves.splice( index, 1 );

	}

	redo (): void {

		this.execute();

	}

}
