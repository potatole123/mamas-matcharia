import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import java.util.List;

public class Testing {

    @Test
    public void RegisterUser_validEmail_validUsername_validPswd_pass() {
        String email = "a@b.c";
        String username = "LebronJames1";
        String pswd = "BronnyJames1!";

        Profile result = RegisterUser(email, username, pswd);

        assertEquals(username, result.displayName);
    }

    @Test
    public void RegisterUser_notValidEmail_validUsername_validPswd_fail() {
        String email = "a@b.";
        String username = "LebronJames1";
        String pswd = "BronnyJames1!";

        assertThrows(IllegalArgumentException.class, () -> {
            RegisterUser(email, username, pswd);
        });
    }

    @Test
    public void RegisterUser_usernameLength1_fail() {
        String email = "a@b.c";
        String username = "a";
        String pswd = "BronnyJames1!";

        assertThrows(IllegalArgumentException.class, () -> {
            RegisterUser(email, username, pswd);
        });
    }

    @Test
    public void RegisterUser_usernameLength2_pass() {
        String email = "a@b.c";
        String username = "L1";
        String pswd = "BronnyJames1!";

        Profile result = RegisterUser(email, username, pswd);

        assertEquals(username, result.displayName);
    }

    @Test
    public void RegisterUser_usernameLength16_pass() {
        String email = "a@b.c";
        String username = "LebronJames12345";
        String pswd = "BronnyJames1!";

        Profile result = RegisterUser(email, username, pswd);

        assertEquals(username, result.displayName);
    }

    @Test
    public void RegisterUser_usernameLength17_fail() {
        String email = "a@b.c";
        String username = "LebronJames123456";
        String pswd = "BronnyJames1!";

        assertThrows(IllegalArgumentException.class, () -> {
            RegisterUser(email, username, pswd);
        });
    }

    @Test
    public void RegisterUser_usernameNotAlphaNumeric_fail() {
        String email = "a@b.c";
        String username = "Lebron_James";
        String pswd = "BronnyJames1!";

        assertThrows(IllegalArgumentException.class, () -> {
            RegisterUser(email, username, pswd);
        });
    }

    @Test
    public void RegisterUser_passwordLength5_fail() {
        String email = "a@b.c";
        String username = "LebronJames1";
        String pswd = "Aa1!b";

        assertThrows(IllegalArgumentException.class, () -> {
            RegisterUser(email, username, pswd);
        });
    }

    @Test
    public void RegisterUser_passwordLength6_pass() {
        String email = "a@b.c";
        String username = "LebronJames1";
        String pswd = "Aa1!bc";

        Profile result = RegisterUser(email, username, pswd);

        assertEquals(username, result.displayName);
    }

       @Test
    public void RegisterUser_passwordLength17_fail() {
        String email = "a@b.c";
        String username = "LebronJames1";
        String pswd = "Aa1!b123456789012";

        assertThrows(IllegalArgumentException.class, () -> {
            RegisterUser(email, username, pswd);
        });
    }

    @Test
    public void RegisterUser_passwordLength16_pass() {
        String email = "a@b.c";
        String username = "LebronJames1";
        String pswd = "Aa1!bc1234567890";

        Profile result = RegisterUser(email, username, pswd);

        assertEquals(username, result.displayName);
    }


    @Test
    public void RegisterUser_passwordMissingUppercase_fail() {
        String email = "a@b.c";
        String username = "LebronJames1";
        String pswd = "bronnyjames1!";

        assertThrows(IllegalArgumentException.class, () -> {
            RegisterUser(email, username, pswd);
        });
    }

    @Test
    public void RegisterUser_passwordMissingLowercase_fail() {
        String email = "a@b.c";
        String username = "LebronJames1";
        String pswd = "BRONNYJAMES1!";

        assertThrows(IllegalArgumentException.class, () -> {
            RegisterUser(email, username, pswd);
        });
    }

    @Test
    public void RegisterUser_passwordMissingNumber_fail() {
        String email = "a@b.c";
        String username = "LebronJames1";
        String pswd = "BronnyJames!";

        assertThrows(IllegalArgumentException.class, () -> {
            RegisterUser(email, username, pswd);
        });
    }

    @Test
    public void RegisterUser_passwordMissingSpecialCharacter_fail() {
        String email = "a@b.c";
        String username = "LebronJames1";
        String pswd = "BronnyJames1";

        assertThrows(IllegalArgumentException.class, () -> {
            RegisterUser(email, username, pswd);
        });
    }

    @Test
    public void LoginUser_validUsername_validPswd_pass() {
        String username = "LebronJames1";
        String pswd = "BronnyJames1!";

        Profile result = LoginUser(username, pswd);

        assertEquals(username, result.displayName);
    }

    @Test
    public void LoginUser_notValidUsername_validPswd_fail() {
        String username = "l";
        String pswd = "BronnyJames1!";

        assertThrows(IllegalArgumentException.class, () -> {
            LoginUser(username, pswd);
        });
    }

    @Test
    public void LoginUser_validUsername_notValidPswd_fail() {
        String username = "LebronJames1";
        String pswd = "b";

        assertThrows(IllegalArgumentException.class, () -> {
            LoginUser(username, pswd);
        });
    }

    @Test
    public void JoinMultiplayerGame_joinCodeLength5_fail() {
        String joinCode = "12345";

        assertThrows(IllegalArgumentException.class, () -> {
            JoinMultiplayerGame(joinCode);
        });
    }

    @Test
    public void JoinMultiplayerGame_joinCodeLength6_pass() {
        String joinCode = "123456";

        JoinMultiplayerGame(joinCode);
    }

    @Test
    public void JoinMultiplayerGame_joinCodeLength7_fail() {
        String joinCode = "1234567";

        assertThrows(IllegalArgumentException.class, () -> {
            JoinMultiplayerGame(joinCode);
        });
    }

    @Test
    public void JoinMultiplayerGame_joinCodeNotInteger_fail() {
        String joinCode = "meowww";

        assertThrows(IllegalArgumentException.class, () -> {
            JoinMultiplayerGame(joinCode);
        });
    }

    @Test
    public void GenerateNPCs_validSeed_validFreq_validRecipeSet_pass() {
        int seed = 42;
        double freq = 4.0;
        RecipeSet recipeSet = new RecipeSet();

        List<NPC> result = GenerateNPCs(seed, freq, recipeSet);

        assertNotNull(result);
    }

    @Test
    public void GenerateNPCs_freqBelowLowerBound_fail() {
        int seed = 42;
        double freq = 1.9;
        RecipeSet recipeSet = new RecipeSet();

        assertThrows(IllegalArgumentException.class, () -> {
            GenerateNPCs(seed, freq, recipeSet);
        });
    }

    @Test
    public void GenerateNPCs_freqAtLowerBound_pass() {
        int seed = 42;
        double freq = 2.0;
        RecipeSet recipeSet = new RecipeSet();

        List<NPC> result = GenerateNPCs(seed, freq, recipeSet);

        assertNotNull(result);
    }

    @Test
    public void GenerateNPCs_freqAtUpperBound_pass() {
        int seed = 42;
        double freq = 6.0;
        RecipeSet recipeSet = new RecipeSet();

        List<NPC> result = GenerateNPCs(seed, freq, recipeSet);

        assertNotNull(result);
    }

    @Test
    public void GenerateNPCs_freqAboveUpperBound_fail() {
        int seed = 42;
        double freq = 6.1;
        RecipeSet recipeSet = new RecipeSet();

        assertThrows(IllegalArgumentException.class, () -> {
            GenerateNPCs(seed, freq, recipeSet);
        });
    }
}