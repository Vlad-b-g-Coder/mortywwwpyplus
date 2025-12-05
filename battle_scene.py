import pygame
import math
import random


WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GOLD = (255, 215, 0)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 120, 255)
PURPLE = (128, 0, 128)
ORANGE = (255, 165, 0)
CYAN = (0, 255, 255)
DARK_GRAY = (50, 50, 50)
GRAY = (100, 100, 100)
LIGHT_GRAY = (150, 150, 150)


MORTY_TYPES = {
    "normal": {
        "name": "Обычный Морти",
        "color": (168, 213, 186),
        "weakness": "rock",
        "strength": "paper"
    },
    "evil": {
        "name": "Злой Морти",
        "color": (247, 168, 168),
        "weakness": "scissors",
        "strength": "rock"
    },
    "scientist": {
        "name": "Ученый Морти",
        "color": (168, 200, 247),
        "weakness": "paper",
        "strength": "scissors"
    },
    "warrior": {
        "name": "Воин Морти",
        "color": (247, 213, 168),
        "weakness": "scissors",
        "strength": "rock"
    }
}


class Morty:
    def __init__(self, name, level, max_hp, morty_type, position, is_player=True):
        self.name = name
        self.level = level
        self.hp = max_hp
        self.max_hp = max_hp
        self.morty_type = morty_type
        self.color = MORTY_TYPES[morty_type]["color"]
        self.position = position
        self.is_player = is_player
        self.animation_offset = 0
        self.base_max_hp = max_hp
        self.base_level = level
        self.weakness = MORTY_TYPES[morty_type]["weakness"]
        self.strength = MORTY_TYPES[morty_type]["strength"]

    def take_damage(self, damage):
        self.hp = max(0, self.hp - damage)
        return self.hp <= 0

    def heal(self, amount):
        self.hp = min(self.max_hp, self.hp + amount)
        return self.hp

    def level_up(self):
        """Повышение уровня Морти"""
        self.level += 1
        self.max_hp = int(self.base_max_hp * (1 + (self.level - self.base_level) * 0.2))
        self.hp = self.max_hp
        return self.level


class MortyBattle:
    def __init__(self, screen):
        self.screen = screen
        self.screen_width = screen.get_width()
        self.screen_height = screen.get_height()
        self.background = self.create_background()

        self.wins_count = 0
        self.enemy_level = 1

        player_x = self.screen_width * 0.2
        player_y = self.screen_height * 0.7
        enemy_x = self.screen_width * 0.8
        enemy_y = self.screen_height * 0.3

        player_type = random.choice(list(MORTY_TYPES.keys()))
        enemy_type = random.choice(list(MORTY_TYPES.keys()))

        self.player_morty = Morty("Morty", 1, 100, player_type, (player_x, player_y), True)
        self.enemy_morty = Morty("Evil Morty", self.enemy_level, 80, enemy_type, (enemy_x, enemy_y), False)

        self.attacks = {
            "rock": {
                "name": "🪨 Камень",
                "beats": "scissors",
                "damage": (20, 30),
                "type": "attack"
            },
            "scissors": {
                "name": "✂️ Ножницы",
                "beats": "paper",
                "damage": (15, 25),
                "type": "attack"
            },
            "paper": {
                "name": "📄 Бумага",
                "beats": "rock",
                "damage": (18, 28),
                "type": "attack"
            },
            "heal": {
                "name": "💊 Лечение",
                "beats": None,
                "heal_amount": (20, 35),
                "type": "heal"
            },
            "strong_attack": {
                "name": "💥 Сильная атака",
                "beats": None,
                "damage": (30, 40),
                "type": "special_attack",
                "cooldown": 3
            },
            "defense": {
                "name": "🛡️ Защита",
                "beats": None,
                "damage_reduction": 0.5,
                "type": "defense"
            }
        }

        self.player_choice = None
        self.enemy_choice = None
        self.round_result = ""

        self.game_state = "player_turn"
        self.message = ""
        self.message_timer = 0

        self.round_damage_player = 0
        self.round_damage_enemy = 0
        self.player_heal = 0
        self.enemy_heal = 0
        self.player_defending = False
        self.enemy_defending = False
        self.is_effective = False
        self.type_bonus = 0

        self.animation_direction = 1
        self.combat_animation = False
        self.combat_timer = 0

        self.player_cooldowns = {}
        self.enemy_cooldowns = {}

        self.create_action_buttons()

        self.back_button = pygame.Rect(20, 20, 100, 30)

        self.enemy_choice_timer = 0
        self.enemy_choice_delay = 1000
        self.round_result_timer = 0
        self.round_result_delay = 3000

        player_type_name = MORTY_TYPES[player_type]["name"]
        enemy_type_name = MORTY_TYPES[enemy_type]["name"]
        self.show_message(f"Битва начинается! Ваш тип: {player_type_name} против {enemy_type_name}", 2500)

    def create_action_buttons(self):
        """Создает кнопки действий игрока"""
        button_width = self.screen_width * 0.12
        button_height = self.screen_height * 0.05
        button_start_x = self.screen_width // 2 - button_width * 2
        button_y = self.screen_height - 130

        self.player_actions = [
            {"rect": pygame.Rect(button_start_x, button_y, button_width, button_height),
             "text": self.attacks["rock"]["name"], "action": "rock", "type": "attack"},
            {"rect": pygame.Rect(button_start_x + button_width + 10, button_y, button_width, button_height),
             "text": self.attacks["scissors"]["name"], "action": "scissors", "type": "attack"},
            {"rect": pygame.Rect(button_start_x + (button_width + 10) * 2, button_y, button_width, button_height),
             "text": self.attacks["paper"]["name"], "action": "paper", "type": "attack"},
        ]

        button_y2 = button_y + button_height + 10
        self.player_actions.extend([
            {"rect": pygame.Rect(button_start_x, button_y2, button_width, button_height),
             "text": self.attacks["heal"]["name"], "action": "heal", "type": "heal"},
            {"rect": pygame.Rect(button_start_x + button_width + 10, button_y2, button_width, button_height),
             "text": self.attacks["strong_attack"]["name"], "action": "strong_attack", "type": "special_attack"},
            {"rect": pygame.Rect(button_start_x + (button_width + 10) * 2, button_y2, button_width, button_height),
             "text": self.attacks["defense"]["name"], "action": "defense", "type": "defense"}
        ])

    def create_background(self):
        """Создание фона боевой сцены"""
        background = pygame.Surface((self.screen_width, self.screen_height))
        background.fill(DARK_GRAY)

        for x in range(0, self.screen_width, 40):
            pygame.draw.line(background, (40, 40, 40), (x, 0), (x, self.screen_height), 1)
        for y in range(0, self.screen_height, 40):
            pygame.draw.line(background, (40, 40, 40), (0, y), (self.screen_width, y), 1)

        pygame.draw.line(background, (70, 70, 70),
                         (self.screen_width // 2, 100),
                         (self.screen_width // 2, self.screen_height - 200), 3)

        return background

    def draw_morty(self, morty, is_attacking=False, damage_effect=False, heal_effect=False):
        """Рисует Морти с возможностью анимации атаки"""
        x, y = morty.position

        y += morty.animation_offset

        if is_attacking and self.combat_animation:
            size_mod = 5 * math.sin(self.combat_timer * 0.2)
        else:
            size_mod = 0

        if damage_effect and self.combat_animation:
            damage_color = (255, 100, 100)
            if int(self.combat_timer / 50) % 2 == 0:
                damage_color = (255, 200, 200)
        elif heal_effect and self.combat_animation:
            damage_color = (100, 255, 100)
        else:
            damage_color = morty.color

        size = min(40, self.screen_width * 0.05)

        pygame.draw.circle(self.screen, damage_color, (int(x), int(y)), int(size + size_mod))

        eye_offset = 0
        if is_attacking and self.combat_animation:
            eye_offset = 3 * math.sin(self.combat_timer * 0.3)

        eye_size = max(3, size // 10)
        pygame.draw.circle(self.screen, BLACK, (int(x - size // 3 + eye_offset), int(y - size // 4)), eye_size)
        pygame.draw.circle(self.screen, BLACK, (int(x + size // 3 + eye_offset), int(y - size // 4)), eye_size)

        mouth_y = y + size // 4
        if is_attacking and self.combat_animation:
            mouth_y += 3 * math.sin(self.combat_timer * 0.4)

        if is_attacking and self.combat_animation:
            pygame.draw.arc(self.screen, BLACK,
                            (x - size // 2, mouth_y - size // 8, size, size // 2),
                            math.pi / 6, 5 * math.pi / 6, 3)
        elif damage_effect and self.combat_animation:
            pygame.draw.ellipse(self.screen, BLACK,
                                (x - size // 3, mouth_y - size // 8, size // 1.5, size // 3))
        elif heal_effect and self.combat_animation:
            pygame.draw.arc(self.screen, BLACK,
                            (x - size // 2, mouth_y - size // 8, size, size // 2),
                            math.pi / 6, 5 * math.pi / 6, 3)
        else:
            pygame.draw.line(self.screen, BLACK,
                             (x - size // 2, mouth_y),
                             (x + size // 2, mouth_y), 3)

    def draw_platform(self, position, size):
        """Рисует платформу для Морти"""
        x, y = position
        width, height = size

        platform_rect = pygame.Rect(x - width // 2, y - height // 2, width, height)
        pygame.draw.rect(self.screen, GRAY, platform_rect, border_radius=5)
        pygame.draw.rect(self.screen, LIGHT_GRAY, platform_rect, 1, border_radius=5)

    def draw_hp_bar(self, morty, position):
        """Рисует HP бар"""
        x, y = position
        width = self.screen_width * 0.15
        height = self.screen_height * 0.02

        bg_rect = pygame.Rect(x, y, width, height)
        pygame.draw.rect(self.screen, DARK_GRAY, bg_rect, border_radius=3)
        pygame.draw.rect(self.screen, LIGHT_GRAY, bg_rect, 1, border_radius=3)

        hp_percent = morty.hp / morty.max_hp if morty.max_hp > 0 else 0
        fill_width = max(0, int(width * hp_percent))
        fill_rect = pygame.Rect(x, y, fill_width, height)

        if hp_percent > 0.6:
            color = GREEN
        elif hp_percent > 0.3:
            color = ORANGE
        else:
            color = RED

        pygame.draw.rect(self.screen, color, fill_rect, border_radius=3)

        font_size = max(12, int(self.screen_height * 0.015))
        font = pygame.font.SysFont('Arial', font_size)
        hp_text = f"HP: {morty.hp}/{morty.max_hp}"
        text_surface = font.render(hp_text, True, WHITE)
        self.screen.blit(text_surface, (
            x + width // 2 - text_surface.get_width() // 2,
            y + height // 2 - text_surface.get_height() // 2
        ))

    def draw_info_panel(self, morty, position):
        """Рисует информационную панель"""
        x, y = position
        width = self.screen_width * 0.15
        height = self.screen_height * 0.08

        panel_rect = pygame.Rect(x, y, width, height)
        pygame.draw.rect(self.screen, DARK_GRAY, panel_rect, border_radius=5)
        pygame.draw.rect(self.screen, LIGHT_GRAY, panel_rect, 1, border_radius=5)

        font_size = max(12, int(self.screen_height * 0.02))
        font = pygame.font.SysFont('Arial', font_size)

        type_name = MORTY_TYPES[morty.morty_type]["name"]
        name_text = font.render(f"{type_name}", True, morty.color)
        level_text = font.render(f"Уровень: {morty.level}", True, LIGHT_GRAY)

        weakness_text = font.render(f"Слабость: {self.get_attack_name(morty.weakness)}", True, RED)
        strength_text = font.render(f"Сила: {self.get_attack_name(morty.strength)}", True, GREEN)

        self.screen.blit(name_text, (x + 10, y + 5))
        self.screen.blit(level_text, (x + 10, y + 25))
        self.screen.blit(weakness_text, (x + 10, y + 45))
        self.screen.blit(strength_text, (x + 10, y + 65))

    def get_attack_name(self, attack_key):
        """Получает название атаки по ключу"""
        if attack_key in self.attacks:
            return self.attacks[attack_key]["name"]
        return "Нет"

    def draw_attack_choice(self):
        """Рисует выбор атак игрока и врага"""
        if self.game_state in ["enemy_turn", "round_result", "game_over"]:
            if self.enemy_choice and self.player_choice:
                font_size = max(16, int(self.screen_height * 0.02))
                font = pygame.font.SysFont('Arial', font_size, bold=True)

                player_action_text = self.attacks[self.player_choice][
                    "name"] if self.player_choice in self.attacks else "?"
                player_text = font.render(player_action_text, True, BLUE)
                player_bg_width = self.screen_width * 0.15
                player_bg = pygame.Rect(self.screen_width * 0.3, self.screen_height * 0.4,
                                        player_bg_width, self.screen_height * 0.05)
                pygame.draw.rect(self.screen, DARK_GRAY, player_bg, border_radius=5)
                pygame.draw.rect(self.screen, BLUE, player_bg, 2, border_radius=5)
                self.screen.blit(player_text, (player_bg.centerx - player_text.get_width() // 2,
                                               player_bg.centery - player_text.get_height() // 2))

                vs_text = font.render("VS", True, GOLD)
                self.screen.blit(vs_text, (self.screen_width // 2 - vs_text.get_width() // 2,
                                           self.screen_height * 0.41))

                enemy_action_text = self.attacks[self.enemy_choice][
                    "name"] if self.enemy_choice in self.attacks else "?"
                enemy_text = font.render(enemy_action_text, True, RED)
                enemy_bg = pygame.Rect(self.screen_width * 0.7 - player_bg_width, self.screen_height * 0.4,
                                       player_bg_width, self.screen_height * 0.05)
                pygame.draw.rect(self.screen, DARK_GRAY, enemy_bg, border_radius=5)
                pygame.draw.rect(self.screen, RED, enemy_bg, 2, border_radius=5)
                self.screen.blit(enemy_text, (enemy_bg.centerx - enemy_text.get_width() // 2,
                                              enemy_bg.centery - enemy_text.get_height() // 2))

    def draw_battle_menu(self):
        """Рисует меню боя"""
        menu_width = min(500, self.screen_width * 0.8)
        menu_height = self.screen_height * 0.25
        menu_rect = pygame.Rect((self.screen_width - menu_width) // 2,
                                self.screen_height - menu_height - 20,
                                menu_width, menu_height)
        pygame.draw.rect(self.screen, DARK_GRAY, menu_rect, border_radius=8)
        pygame.draw.rect(self.screen, LIGHT_GRAY, menu_rect, 2, border_radius=8)

        font_size = max(16, int(self.screen_height * 0.02))
        font = pygame.font.SysFont('Arial', font_size)

        if self.game_state == "game_over":
            if self.player_morty.hp <= 0:
                title = font.render("Поражение! Морти проиграл!", True, RED)
            else:
                title = font.render("Победа! Морти победил!", True, GREEN)
        elif self.game_state == "player_turn":
            title = font.render("Выберите действие:", True, LIGHT_GRAY)
        elif self.game_state == "enemy_turn":
            title = font.render("Злой Морти выбирает действие...", True, RED)
        elif self.game_state == "round_result":
            title = font.render("Результат раунда:", True, GOLD)

        self.screen.blit(title, (self.screen_width // 2 - title.get_width() // 2,
                                 self.screen_height - menu_height + 15))

        button_font_size = max(12, int(self.screen_height * 0.018))
        button_font = pygame.font.SysFont('Arial', button_font_size)

        for i, action in enumerate(self.player_actions):
            is_on_cooldown = False
            if action["action"] in self.player_cooldowns and self.player_cooldowns[action["action"]] > 0:
                is_on_cooldown = True

            if self.game_state == "player_turn" and not is_on_cooldown:
                color = GRAY  # Активные кнопки
                text_color = WHITE
            else:
                color = DARK_GRAY  # Неактивные кнопки
                text_color = LIGHT_GRAY

            pygame.draw.rect(self.screen, color, action["rect"], border_radius=5)
            pygame.draw.rect(self.screen, LIGHT_GRAY, action["rect"], 1, border_radius=5)

            button_text = action["text"]
            if is_on_cooldown:
                button_text += f" ({self.player_cooldowns[action['action']]})"
                text_color = RED

            text = button_font.render(button_text, True, text_color)
            text_rect = text.get_rect(center=action["rect"].center)
            self.screen.blit(text, text_rect)

        if self.game_state == "round_result" and self.round_result:
            font_size = max(14, int(self.screen_height * 0.018))
            font = pygame.font.SysFont('Arial', font_size)

            result_color = GREEN if "выигрывает" in self.round_result else RED if "проигрывает" in self.round_result else GOLD
            result_text = font.render(self.round_result, True, result_color)
            self.screen.blit(result_text, (self.screen_width // 2 - result_text.get_width() // 2,
                                           self.screen_height - menu_height + 60))

            if self.round_damage_player > 0:
                damage_text = font.render(f"Вы нанесли {self.round_damage_player} урона", True, BLUE)
                self.screen.blit(damage_text, (self.screen_width // 2 - damage_text.get_width() // 2,
                                               self.screen_height - menu_height + 85))
            elif self.player_heal > 0:
                heal_text = font.render(f"Вы восстановили {self.player_heal} HP", True, GREEN)
                self.screen.blit(heal_text, (self.screen_width // 2 - heal_text.get_width() // 2,
                                             self.screen_height - menu_height + 85))

            if self.round_damage_enemy > 0:
                damage_text = font.render(f"Вам нанесли {self.round_damage_enemy} урона", True, RED)
                self.screen.blit(damage_text, (self.screen_width // 2 - damage_text.get_width() // 2,
                                               self.screen_height - menu_height + 110))
            elif self.enemy_heal > 0:
                heal_text = font.render(f"Враг восстановил {self.enemy_heal} HP", True, PURPLE)
                self.screen.blit(heal_text, (self.screen_width // 2 - heal_text.get_width() // 2,
                                             self.screen_height - menu_height + 110))

            # Бонус за тип
            if self.type_bonus > 0:
                bonus_text = font.render(f"Бонус типа: +{self.type_bonus}% урона", True, GOLD)
                self.screen.blit(bonus_text, (self.screen_width // 2 - bonus_text.get_width() // 2,
                                              self.screen_height - menu_height + 135))

    def draw_message(self):
        """Рисует сообщение боя"""
        if self.message and self.message_timer > 0:
            font_size = max(16, int(self.screen_height * 0.02))
            font = pygame.font.SysFont('Arial', font_size)
            text_surface = font.render(self.message, True, WHITE)

            message_rect = pygame.Rect(
                self.screen_width // 2 - text_surface.get_width() // 2 - 20,
                self.screen_height // 2 - text_surface.get_height() // 2 - 15,
                text_surface.get_width() + 40,
                text_surface.get_height() + 30
            )

            pygame.draw.rect(self.screen, DARK_GRAY, message_rect, border_radius=8)
            pygame.draw.rect(self.screen, LIGHT_GRAY, message_rect, 2, border_radius=8)

            self.screen.blit(text_surface, (
                self.screen_width // 2 - text_surface.get_width() // 2,
                self.screen_height // 2 - text_surface.get_height() // 2
            ))

    def draw_wins_counter(self):
        """Рисует счетчик побед"""
        font_size = max(18, int(self.screen_height * 0.022))
        font = pygame.font.SysFont('Arial', font_size, bold=True)
        wins_text = font.render(f"Побед подряд: {self.wins_count}", True, GOLD)

        counter_bg = pygame.Rect(10, 60, 200, 40)
        pygame.draw.rect(self.screen, DARK_GRAY, counter_bg, border_radius=5)
        pygame.draw.rect(self.screen, GOLD, counter_bg, 2, border_radius=5)

        self.screen.blit(wins_text, (20, 70))

        enemy_level_text = font.render(f"Уровень врага: {self.enemy_morty.level}", True, RED)
        self.screen.blit(enemy_level_text, (20, 100))

    def show_message(self, message, duration=1500):
        """Показывает сообщение на указанное время"""
        self.message = message
        self.message_timer = duration

    def determine_winner(self, player_attack, enemy_attack):
        """Определяет победителя в раунде РПС"""
        if player_attack == enemy_attack:
            return "draw"

        if player_attack in ["heal", "defense", "strong_attack"] or enemy_attack in ["heal", "defense",
                                                                                     "strong_attack"]:
            return "special"

        if self.attacks[player_attack]["beats"] == enemy_attack:
            return "player"  # Игрок выиграл
        else:
            return "enemy"  # Враг выиграл

    def calculate_type_bonus(self, attacker, attack_type, defender):
        """Рассчитывает бонус урона за тип"""
        bonus = 0

        if attack_type == defender.weakness:
            bonus = 50  # +50% урона

        if attacker.strength == attack_type:
            bonus += 25  # дополнительные +25% урона

        return bonus

    def player_action(self, action_type):
        """Действие игрока"""
        if self.game_state != "player_turn":
            return

        # Проверяем кулдаун
        if action_type in self.player_cooldowns and self.player_cooldowns[action_type] > 0:
            self.show_message(f"Действие {self.attacks[action_type]['name']} на кулдауне!", 1000)
            return

        # Игрок делает выбор
        self.player_choice = action_type
        self.game_state = "enemy_turn"
        self.enemy_choice_timer = self.enemy_choice_delay

        # Устанавливаем кулдаун для специальных атак
        if action_type in ["strong_attack", "heal", "defense"]:
            cooldown = self.attacks[action_type].get("cooldown", 2)
            self.player_cooldowns[action_type] = cooldown

        self.show_message(f"Вы выбрали: {self.attacks[action_type]['name']}...", 1000)

    def enemy_choose(self):
        """Враг делает выбор"""
        choices = ["rock", "scissors", "paper", "heal", "defense", "strong_attack"]
        weights = [0.25, 0.25, 0.25, 0.1, 0.1, 0.05]  # Вероятности выбора

        available_choices = []
        available_weights = []

        for i, choice in enumerate(choices):
            if choice not in self.enemy_cooldowns or self.enemy_cooldowns[choice] <= 0:
                available_choices.append(choice)
                available_weights.append(weights[i])

        # Если все на кулдауне, выбираем из основных атак
        if not available_choices:
            available_choices = ["rock", "scissors", "paper"]
            available_weights = [0.33, 0.33, 0.34]

        self.enemy_choice = random.choices(available_choices, weights=available_weights, k=1)[0]

        if self.enemy_choice in ["strong_attack", "heal", "defense"]:
            cooldown = self.attacks[self.enemy_choice].get("cooldown", 2)
            self.enemy_cooldowns[self.enemy_choice] = cooldown

        self.game_state = "round_result"
        self.round_result_timer = self.round_result_delay

        self.combat_animation = True
        self.combat_timer = 0

        self.calculate_round_results()

    def calculate_round_results(self):
        """Рассчитывает результаты раунда"""
        self.round_damage_player = 0
        self.round_damage_enemy = 0
        self.player_heal = 0
        self.enemy_heal = 0
        self.type_bonus = 0

        player_action = self.attacks[self.player_choice]

        if player_action["type"] == "attack":
            base_damage = random.randint(*player_action["damage"])

            self.type_bonus = self.calculate_type_bonus(
                self.player_morty, self.player_choice, self.enemy_morty
            )

            damage_multiplier = 1 + self.type_bonus / 100
            self.round_damage_player = int(base_damage * damage_multiplier)

            if self.enemy_defending:
                self.round_damage_player = int(self.round_damage_player * 0.5)

        elif player_action["type"] == "heal":
            heal_amount = random.randint(*player_action["heal_amount"])
            self.player_heal = heal_amount
            self.player_morty.heal(heal_amount)

        elif player_action["type"] == "special_attack":
            base_damage = random.randint(*player_action["damage"])
            self.round_damage_player = base_damage

            # бонус за тип
            type_bonus = self.calculate_type_bonus(
                self.player_morty, "rock", self.enemy_morty  # Сильная атака считается как камень
            )
            damage_multiplier = 1 + type_bonus / 100
            self.round_damage_player = int(self.round_damage_player * damage_multiplier)

        elif player_action["type"] == "defense":
            #  игрок защищается
            self.player_defending = True
            self.round_result = "Вы защищаетесь! Урон снижен на 50%"
            return

        enemy_action = self.attacks[self.enemy_choice]

        if enemy_action["type"] == "attack":
            base_damage = random.randint(*enemy_action["damage"])

            enemy_type_bonus = self.calculate_type_bonus(
                self.enemy_morty, self.enemy_choice, self.player_morty
            )

            damage_multiplier = 1 + enemy_type_bonus / 100
            self.round_damage_enemy = int(base_damage * damage_multiplier)

            if self.player_defending:
                self.round_damage_enemy = int(self.round_damage_enemy * 0.5)

        elif enemy_action["type"] == "heal":
            heal_amount = random.randint(*enemy_action["heal_amount"])
            self.enemy_heal = heal_amount
            self.enemy_morty.heal(heal_amount)

        elif enemy_action["type"] == "special_attack":
            base_damage = random.randint(*enemy_action["damage"])
            self.round_damage_enemy = base_damage

        elif enemy_action["type"] == "defense":
            self.enemy_defending = True
            self.round_result = "Враг защищается! Урон снижен на 50%"
            return

        if player_action["type"] == "attack" and enemy_action["type"] == "attack":
            result = self.determine_winner(self.player_choice, self.enemy_choice)

            if result == "player":
                self.round_damage_player = int(self.round_damage_player * 1.5)
                self.round_damage_enemy = int(self.round_damage_enemy * 0.5)
                self.round_result = f"{player_action['name']} выигрывает у {enemy_action['name']}!"
            elif result == "enemy":
                self.round_damage_player = int(self.round_damage_player * 0.5)
                self.round_damage_enemy = int(self.round_damage_enemy * 1.5)
                self.round_result = f"{enemy_action['name']} выигрывает у {player_action['name']}!"
            else:
                self.round_result = "Ничья! Оба получают урон!"
        else:
            if self.player_heal > 0:
                self.round_result = f"Вы восстановили {self.player_heal} HP!"
            elif self.enemy_heal > 0:
                self.round_result = f"Враг восстановил {self.enemy_heal} HP!"
            else:
                self.round_result = "Специальные действия!"

    def apply_damage(self):
        """Применяет урон от раунда"""
        enemy_defeated = False
        player_defeated = False

        if self.round_damage_player > 0:
            enemy_defeated = self.enemy_morty.take_damage(self.round_damage_player)

        if self.round_damage_enemy > 0:
            player_defeated = self.player_morty.take_damage(self.round_damage_enemy)

        self.player_defending = False
        self.enemy_defending = False

        for action in list(self.player_cooldowns.keys()):
            if self.player_cooldowns[action] > 0:
                self.player_cooldowns[action] -= 1

        for action in list(self.enemy_cooldowns.keys()):
            if self.enemy_cooldowns[action] > 0:
                self.enemy_cooldowns[action] -= 1

        # Проверяем окончание боя
        if enemy_defeated:
            self.game_state = "game_over"
            self.wins_count += 1
            self.enemy_level += 1
            self.message = f"Победа! Злой Морти побежден! Побед подряд: {self.wins_count}"
            self.message_timer = 3000
        elif player_defeated:
            self.game_state = "game_over"
            self.wins_count = 0
            self.enemy_level = max(1, self.enemy_level - 1)
            self.message = f"Поражение! Морти проиграл! Счетчик побед сброшен."
            self.message_timer = 3000
        else:
            pass

    def reset_round(self):
        """Сброс раунда для следующего хода"""
        self.player_choice = None
        self.enemy_choice = None
        self.round_result = ""
        self.round_damage_player = 0
        self.round_damage_enemy = 0
        self.player_heal = 0
        self.enemy_heal = 0
        self.type_bonus = 0
        self.game_state = "player_turn"
        self.combat_animation = False
        self.combat_timer = 0
        self.player_defending = False
        self.enemy_defending = False

    def start_new_battle(self):
        """Начинает новый бой после победы"""
        player_x = self.screen_width * 0.2
        player_y = self.screen_height * 0.7
        enemy_x = self.screen_width * 0.8
        enemy_y = self.screen_height * 0.3

        if self.player_morty.hp <= 0:
            player_type = random.choice(list(MORTY_TYPES.keys()))
            enemy_type = random.choice(list(MORTY_TYPES.keys()))

            self.player_morty = Morty("Morty", 1, 100, player_type, (player_x, player_y), True)
            self.enemy_morty = Morty("Evil Morty", 1, 80, enemy_type, (enemy_x, enemy_y), False)
            self.enemy_level = 1
            self.wins_count = 0
        else:
            # если игрок выиграл, усиливаем врага
            enemy_type = random.choice(list(MORTY_TYPES.keys()))
            self.enemy_morty = Morty("Evil Morty", self.enemy_level,
                                     int(80 * (1 + (self.enemy_level - 1) * 0.3)),
                                     enemy_type, (enemy_x, enemy_y), False)
            heal_amount = int(self.player_morty.max_hp * 0.3)
            self.player_morty.heal(heal_amount)

        self.player_cooldowns = {}
        self.enemy_cooldowns = {}

        self.game_state = "player_turn"
        self.reset_round()

        player_type_name = MORTY_TYPES[self.player_morty.morty_type]["name"]
        enemy_type_name = MORTY_TYPES[self.enemy_morty.morty_type]["name"]
        self.show_message(f"Новый бой! {player_type_name} против {enemy_type_name}", 2500)

    def handle_event(self, event):
        """Обработка событий"""
        if event.type == pygame.QUIT:
            return "quit"

        elif event.type == pygame.MOUSEBUTTONDOWN:
            mouse_pos = pygame.mouse.get_pos()

            if self.back_button.collidepoint(mouse_pos):
                return "back_to_menu"

            if self.game_state == "player_turn":
                for action in self.player_actions:
                    if action["rect"].collidepoint(mouse_pos):
                        self.player_action(action["action"])
                        break

        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                return "back_to_menu"
            elif event.key == pygame.K_r and self.game_state == "game_over":
                # Начать новый бой при нажатии R
                self.start_new_battle()
                return None
            elif event.key == pygame.K_1 and self.game_state == "player_turn":
                self.player_action("rock")
            elif event.key == pygame.K_2 and self.game_state == "player_turn":
                self.player_action("scissors")
            elif event.key == pygame.K_3 and self.game_state == "player_turn":
                self.player_action("paper")
            elif event.key == pygame.K_4 and self.game_state == "player_turn":
                self.player_action("heal")
            elif event.key == pygame.K_5 and self.game_state == "player_turn":
                self.player_action("strong_attack")
            elif event.key == pygame.K_6 and self.game_state == "player_turn":
                self.player_action("defense")
            elif event.key == pygame.K_SPACE:
                if self.game_state == "round_result":
                    self.apply_damage()
                    if self.game_state != "game_over":
                        self.reset_round()
                elif self.game_state == "enemy_turn":
                    self.enemy_choose()

        return None

    def update(self, dt):
        """Обновление состояния сцены"""
        if self.message_timer > 0:
            self.message_timer -= dt

        if self.game_state == "enemy_turn":
            self.enemy_choice_timer -= dt
            if self.enemy_choice_timer <= 0:
                self.enemy_choose()

        # Анимация плавающего движения Морти
        self.player_morty.animation_offset += 0.1 * self.animation_direction
        self.enemy_morty.animation_offset += 0.1 * self.animation_direction
        if abs(self.player_morty.animation_offset) > 3:
            self.animation_direction *= -1

        if self.combat_animation:
            self.combat_timer += dt
            if self.combat_timer > 500:
                self.combat_animation = False
                self.combat_timer = 0

    def draw(self):
        """Отрисовка всей сцены"""
        self.screen.blit(self.background, (0, 0))

        platform_width = self.screen_width * 0.15
        platform_height = self.screen_height * 0.08
        self.draw_platform(self.player_morty.position, (platform_width, platform_height))
        self.draw_platform(self.enemy_morty.position, (platform_width, platform_height))

        # морти с анимацией
        player_is_attacking = False
        enemy_is_attacking = False
        player_taking_damage = False
        enemy_taking_damage = False
        player_healing = False
        enemy_healing = False

        if self.game_state == "round_result" and self.player_choice and self.enemy_choice:
            player_action = self.attacks[self.player_choice]
            enemy_action = self.attacks[self.enemy_choice]

            if player_action["type"] in ["attack", "special_attack"] and self.round_damage_player > 0:
                player_is_attacking = True
                enemy_taking_damage = True
            elif player_action["type"] == "heal" and self.player_heal > 0:
                player_healing = True

            if enemy_action["type"] in ["attack", "special_attack"] and self.round_damage_enemy > 0:
                enemy_is_attacking = True
                player_taking_damage = True
            elif enemy_action["type"] == "heal" and self.enemy_heal > 0:
                enemy_healing = True

        self.draw_morty(self.player_morty,
                        is_attacking=player_is_attacking and self.combat_animation,
                        damage_effect=player_taking_damage and self.combat_animation,
                        heal_effect=player_healing and self.combat_animation)
        self.draw_morty(self.enemy_morty,
                        is_attacking=enemy_is_attacking and self.combat_animation,
                        damage_effect=enemy_taking_damage and self.combat_animation,
                        heal_effect=enemy_healing and self.combat_animation)

        self.draw_hp_bar(self.player_morty, (self.screen_width * 0.05, self.screen_height * 0.62))
        self.draw_hp_bar(self.enemy_morty, (self.screen_width * 0.8, self.screen_height * 0.13))

        self.draw_info_panel(self.player_morty, (self.screen_width * 0.05, self.screen_height * 0.65))
        self.draw_info_panel(self.enemy_morty, (self.screen_width * 0.8, self.screen_height * 0.16))

        self.draw_attack_choice()
        self.draw_wins_counter()

        self.draw_battle_menu()

        self.draw_message()

        pygame.draw.rect(self.screen, DARK_GRAY, self.back_button, border_radius=3)
        pygame.draw.rect(self.screen, LIGHT_GRAY, self.back_button, 1, border_radius=3)
        font_size = max(12, int(self.screen_height * 0.018))
        font = pygame.font.SysFont('Arial', font_size)
        back_text = font.render("← Назад", True, WHITE)
        self.screen.blit(back_text, (
            self.back_button.centerx - back_text.get_width() // 2,
            self.back_button.centery - back_text.get_height() // 2
        ))

        if self.game_state == "game_over":
            font_size = max(14, int(self.screen_height * 0.02))
            font = pygame.font.SysFont('Arial', font_size)
            hint_text = font.render("Нажмите R для нового боя", True, LIGHT_GRAY)
            self.screen.blit(hint_text, (
                self.screen_width // 2 - hint_text.get_width() // 2,
                self.screen_height * 0.9
            ))
        elif self.game_state == "round_result":
            font_size = max(14, int(self.screen_height * 0.02))
            font = pygame.font.SysFont('Arial', font_size)
            hint_text = font.render("Нажмите SPACE чтобы продолжить", True, LIGHT_GRAY)
            self.screen.blit(hint_text, (
                self.screen_width // 2 - hint_text.get_width() // 2,
                self.screen_height * 0.9
            ))
        elif self.game_state == "enemy_turn":
            font_size = max(14, int(self.screen_height * 0.02))
            font = pygame.font.SysFont('Arial', font_size)
            hint_text = font.render("Нажмите SPACE чтобы пропустить ожидание", True, LIGHT_GRAY)
            self.screen.blit(hint_text, (
                self.screen_width // 2 - hint_text.get_width() // 2,
                self.screen_height * 0.9
            ))

        font_size = max(12, int(self.screen_height * 0.016))
        font = pygame.font.SysFont('Arial', font_size)
        controls = [
            "Управление: 1-Камень(20-30) 2-Ножницы(15-25) 3-Бумага(18-28) 4-Лечение 5-Сильная атака(30-40) 6-Защита",
            "SPACE-пропуск ожидания, R-новый бой. Каждый тип имеет слабости и силы!"
        ]

        for i, text in enumerate(controls):
            control_text = font.render(text, True, LIGHT_GRAY)
            self.screen.blit(control_text, (
                self.screen_width // 2 - control_text.get_width() // 2,
                self.screen_height * 0.95 + i * 20
            ))