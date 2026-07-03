import { prisma } from "../prisma/client.js";

export class PolicyService {
  static async get() {
    return prisma.hotelPolicy.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });
  }

 static async update(data: any) {
 
  const current = await this.get();

  return prisma.hotelPolicy.update({
    where: { id: "default" },
    data: {
      paymentHoldMinutes: data.paymentHoldMinutes !== undefined ? Number(data.paymentHoldMinutes) : current.paymentHoldMinutes,
      cancellationFeePercent: data.cancellationFeePercent !== undefined ? Number(data.cancellationFeePercent) : current.cancellationFeePercent,
      minCancellationFee: data.minCancellationFee !== undefined ? Number(data.minCancellationFee) : current.minCancellationFee,
      lateCheckoutGraceMinutes: data.lateCheckoutGraceMinutes !== undefined ? Number(data.lateCheckoutGraceMinutes) : current.lateCheckoutGraceMinutes,
      lateCheckoutHourlyFee: data.lateCheckoutHourlyFee !== undefined ? Number(data.lateCheckoutHourlyFee) : current.lateCheckoutHourlyFee,
      earlyCheckoutRefundPercent: data.earlyCheckoutRefundPercent !== undefined ? Number(data.earlyCheckoutRefundPercent) : current.earlyCheckoutRefundPercent,
    },
  });
}
static async createNew(data: any) {

  return prisma.hotelPolicy.create({
    data: {
      paymentHoldMinutes: data.paymentHoldMinutes !== undefined ? Number(data.paymentHoldMinutes) : 60,
      cancellationFeePercent: data.cancellationFeePercent !== undefined ? Number(data.cancellationFeePercent) : 20,
      minCancellationFee: data.minCancellationFee !== undefined ? Number(data.minCancellationFee) : 50,
      lateCheckoutGraceMinutes: data.lateCheckoutGraceMinutes !== undefined ? Number(data.lateCheckoutGraceMinutes) : 30,
      lateCheckoutHourlyFee: data.lateCheckoutHourlyFee !== undefined ? Number(data.lateCheckoutHourlyFee) : 20,
      earlyCheckoutRefundPercent: data.earlyCheckoutRefundPercent !== undefined ? Number(data.earlyCheckoutRefundPercent) : 50,
    },
  });
}
}