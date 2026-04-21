import { Router } from 'express';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();
const router = Router();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Connect to LM Studio local server
const openaiClient = new OpenAI({
  apiKey: 'not-needed',
  baseURL: 'http://localhost:1234/v1',
});

const SYSTEM_PROMPT = `You are an OCR extraction agent for a Thai car gantry system. Analyze the provided image of a license plate. Extract the plate number and the province. 

You MUST respond ONLY with a raw JSON object in the following format, with no markdown formatting or conversational text:
{
"plateNumber": "string",
"province": "string"
}`;

router.post('/process-image', async (req, res) => {
  let initialPath = '';
  let historyPath = '';

  try {
    const { image, flowType } = req.body; // image should be base64 string, flowType: 'incoming' or 'outgoing'
    if (!image || !flowType) {
      return res.status(400).json({ error: 'Image and flowType are required.' });
    }

    const filename = `plate-${Date.now()}.png`; // Saving as png depending on the user's upload type, but we use a generic naming
    const folderPrefix = flowType === 'incoming' ? 'incoming' : 'outgoing';

    // Using path relative to backend root:
    // backend/src/routes/api.ts -> 3 levels up to workspace root 'f:\antigravity\car-plate'
    const rootDir = path.join(__dirname, '..', '..');
    initialPath = path.join(rootDir, `${folderPrefix}-carplate-images`, filename);
    historyPath = path.join(rootDir, `${folderPrefix}-carplate-images-history`, filename);

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    await fs.writeFile(initialPath, base64Data, 'base64');


    // Prepare image for LM Studio processing
    // Assuming image is a base64 string like "data:image/jpeg;base64,..."
    const response = await openaiClient.chat.completions.create({
      model: 'typhoon-ocr1.5-2b',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: image,
              },
            },
          ],
        },
      ],
      max_tokens: 200,
      temperature: 0,
    });

    const rawContent = response.choices[0]?.message?.content || '{}';
    let expectedOutput: { plateNumber: string; province: string };

    try {
      expectedOutput = JSON.parse(rawContent);
    } catch (e) {
      // attempt recovery if some markdown is injected
      const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      expectedOutput = JSON.parse(cleaned);
    }

    const { plateNumber, province } = expectedOutput;

    if (!plateNumber) {
      return res.status(400).json({ error: 'Could not extract plate number.', rawJson: rawContent });
    }

    let status = '';

    if (flowType === 'incoming') {
      let vehicle = await prisma.vehicle.findUnique({
        where: { plateNumber },
      });

      if (!vehicle) {
        // Create an unregistered vehicle record to satisfy foreign key
        vehicle = await prisma.vehicle.create({
          data: {
            plateNumber,
            province: province || undefined,
            isRegistered: false,
          }
        });
      }

      if (vehicle.isRegistered) {
        status = 'ENTERED';
      } else {
        status = 'DENIED_UNREGISTERED';
      }

      await prisma.gantryLog.create({
        data: {
          vehicleUUID: vehicle.id,
          plateNumber,
          status,
        },
      });

    } else if (flowType === 'outgoing') {
      // Find latest entered log
      const activeLog = await prisma.gantryLog.findFirst({
        where: { plateNumber, status: 'ENTERED' },
        orderBy: { entryTime: 'desc' },
      });

      if (activeLog) {
        const exitTime = new Date();
        const durationMinutes = Math.floor((exitTime.getTime() - activeLog.entryTime.getTime()) / 60000);
        status = 'EXITED';

        await prisma.gantryLog.update({
          where: { id: activeLog.id },
          data: { exitTime, durationMinutes, status },
        });
      } else {
        status = 'ERROR_NO_ENTRY_FOUND';
      }
    }

    // Move the processed image to history folder
    try {
      await fs.rename(initialPath, historyPath);
    } catch (fsError) {
      console.error(`Failed to move image to history folder from ${initialPath} to ${historyPath}`, fsError);
    }

    return res.json({
      status,
      plateNumber,
      province,
      rawJson: rawContent,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error processing image.' });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const { plateNumber, date } = req.query;
    let whereCondition: any = {};

    if (plateNumber) {
      whereCondition.plateNumber = {
        contains: String(plateNumber),
      };
    }

    if (date) {
      const startDate = new Date(String(date));
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);

      whereCondition.entryTime = {
        gte: startDate,
        lte: endDate
      };
    }

    const logs = await prisma.gantryLog.findMany({
      where: whereCondition,
      orderBy: {
        entryTime: 'desc'
      },
      include: {
        vehicle: true
      }
    });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

export default router;
