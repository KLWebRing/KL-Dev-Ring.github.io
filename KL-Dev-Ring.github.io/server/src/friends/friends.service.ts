// ── KL DevVerse — Friends Service ────────────────────────────────────
// Manages friend requests, friendships, and friend-related queries.

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceService } from '../presence/presence.service';

@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
  ) {}

  /** Send a friend request */
  async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if already friends
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userAId: senderId, userBId: receiverId },
          { userAId: receiverId, userBId: senderId },
        ],
      },
    });
    if (existing) throw new BadRequestException('Already friends');

    // Check for existing pending request
    const pendingRequest = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId, status: 'PENDING' },
          { senderId: receiverId, receiverId: senderId, status: 'PENDING' },
        ],
      },
    });
    if (pendingRequest) throw new BadRequestException('Request already pending');

    return this.prisma.friendRequest.create({
      data: { senderId, receiverId },
      include: { sender: true, receiver: true },
    });
  }

  /** Accept a friend request */
  async acceptRequest(requestId: string, userId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.receiverId !== userId) throw new BadRequestException('Not your request');
    if (request.status !== 'PENDING') throw new BadRequestException('Request already handled');

    // Create friendship (always store userA < userB for consistency)
    const [userAId, userBId] = [request.senderId, request.receiverId].sort();

    await this.prisma.$transaction([
      this.prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
      }),
      this.prisma.friendship.create({
        data: { userAId, userBId },
      }),
    ]);

    this.logger.log(`Friendship created: ${userAId} <-> ${userBId}`);
    return { success: true };
  }

  /** Reject a friend request */
  async rejectRequest(requestId: string, userId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.receiverId !== userId) throw new BadRequestException('Not your request');

    await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    return { success: true };
  }

  /** Remove a friendship */
  async removeFriend(userId: string, friendUserId: string) {
    const [userAId, userBId] = [userId, friendUserId].sort();

    const friendship = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });

    if (!friendship) throw new NotFoundException('Not friends');

    await this.prisma.friendship.delete({
      where: { id: friendship.id },
    });

    return { success: true };
  }

  /** Get all friends for a user (with online status) */
  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        userA: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        userB: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    const friends = friendships.map((f) => {
      const friend = f.userAId === userId ? f.userB : f.userA;
      return {
        friendshipId: f.id,
        userId: friend.id,
        username: friend.username,
        displayName: friend.displayName,
        avatarUrl: friend.avatarUrl,
      };
    });

    // Batch check online status
    const presenceMap = await this.presence.getPresenceBatch(
      friends.map((f) => f.userId),
    );

    return friends.map((f) => ({
      ...f,
      status: presenceMap.has(f.userId) ? 'online' : 'offline',
      lastSeen: null, // TODO: from DB
    }));
  }

  /** Get pending friend requests received by a user */
  async getPendingRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Check if two users are friends */
  async areFriends(userAId: string, userBId: string): Promise<boolean> {
    const [a, b] = [userAId, userBId].sort();
    const friendship = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId: a, userBId: b } },
    });
    return !!friendship;
  }
}
