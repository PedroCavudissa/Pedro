
import { Request, Response } from "express";

import { AmenityService } from "../services/amenity.service.js";

export class AmenityController {

  static async create(req: Request, res: Response) {

    try {

      const amenity = await AmenityService.create(req.body);

      return res.status(201).json(amenity);

    } catch (error: any) {

      return res.status(400).json({
        error: error.message,
      });
    }
  }

  static async findAll(req: Request, res: Response) {

    try {

      const amenities = await AmenityService.findAll();

      return res.json(amenities);

    } catch (error: any) {

      return res.status(400).json({
        error: error.message,
      });
    }
  }

  static async update(req: Request, res: Response) {

    try {

      const amenity = await AmenityService.update(
        req.params.id as string,
        req.body
      );

      return res.json(amenity);

    } catch (error: any) {

      return res.status(400).json({
        error: error.message,
      });
    }
  }

  static async delete(req: Request, res: Response) {

    try {

      const result = await AmenityService.delete(
        req.params.id as string,
      );

      return res.json(result);

    } catch (error: any) {

      return res.status(400).json({
        error: error.message,
      });
    }
  }
}