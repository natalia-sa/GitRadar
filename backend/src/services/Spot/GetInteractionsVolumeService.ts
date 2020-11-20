import { Between, getRepository } from 'typeorm';
import SpotDailyReport from '../../models/SpotDailyReport';

interface Request {
  since: string;
  until: string;
  spot_id: string;
}

interface Data {
  date: Date;
  value: number;
}

interface DataBaseRequest {
  created_at: Date;
  new_interactions: number;
}

class GetInteractionsVolumeService {
  async execute({ since, until, spot_id }: Request): Promise<Data[]> {
    const dailyReportRepository = getRepository(SpotDailyReport);

    const dailyReports = await dailyReportRepository.find({
      where: {
        created_at: Between(since, until),
        spot_id,
      },
      select: ['created_at', 'new_interactions'],
      order: {
        created_at: 'ASC',
      },
    });

    const parsedData = dailyReports.map(
      ({ created_at, new_interactions }: DataBaseRequest) => {
        return {
          value: new_interactions,
          date: created_at,
        };
      },
    );

    return parsedData;
  }
}

export default GetInteractionsVolumeService;
