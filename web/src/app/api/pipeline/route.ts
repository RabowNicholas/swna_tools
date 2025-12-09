import { NextResponse } from 'next/server';
import { airtableService } from '@/lib/airtable';
import { PIPELINE_STAGES, getStagesForStatus } from '@/lib/pipeline-config';

export const dynamic = 'force-dynamic';

interface ClientWithStages {
  id: string;
  name: string;
  status: string[];
  stages: string[]; // stage IDs this client belongs to
}

interface StageData {
  id: string;
  name: string;
  description: string;
  color: string;
  count: number;
  clients: {
    id: string;
    name: string;
    status: string[];
  }[];
}

export async function GET() {
  try {
    // Fetch all clients from Airtable
    const clients = await airtableService.getClients();

    // Process clients and assign them to stages
    const clientsWithStages: ClientWithStages[] = clients.map(client => {
      const name = (client.fields.Name as string) || 'Unknown';
      const statusField = client.fields.Status;

      // Status can be a string array or undefined
      const status: string[] = Array.isArray(statusField)
        ? statusField
        : statusField
          ? [String(statusField)]
          : [];

      // Find which stages this client belongs to based on their status tags
      const stageIds = new Set<string>();
      status.forEach(statusTag => {
        const matchingStages = getStagesForStatus(statusTag);
        matchingStages.forEach(stage => stageIds.add(stage.id));
      });

      return {
        id: client.id,
        name,
        status,
        stages: Array.from(stageIds),
      };
    });

    // Group clients by stage and count them
    const stageData: StageData[] = PIPELINE_STAGES.map(stage => {
      const stageClients = clientsWithStages.filter(client =>
        client.stages.includes(stage.id)
      );

      return {
        id: stage.id,
        name: stage.name,
        description: stage.description,
        color: stage.color,
        count: stageClients.length,
        clients: stageClients.map(client => ({
          id: client.id,
          name: client.name,
          status: client.status,
        })),
      };
    });

    // Calculate totals
    const totalClients = clients.length;
    const clientsWithStatus = clientsWithStages.filter(c => c.stages.length > 0).length;
    const clientsWithoutStatus = totalClients - clientsWithStatus;

    return NextResponse.json({
      success: true,
      data: {
        stages: stageData,
        summary: {
          totalClients,
          clientsWithStatus,
          clientsWithoutStatus,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching pipeline data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
