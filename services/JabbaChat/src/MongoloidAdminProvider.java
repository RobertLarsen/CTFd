import org.jivesoftware.openfire.admin.AdminProvider;
import org.xmpp.packet.JID;
import org.jivesoftware.util.JiveGlobals;
import java.util.List;
import java.util.LinkedList;

public class MongoloidAdminProvider implements AdminProvider {
    public List<JID> getAdmins() {
        return MongoloidDatabase.getInstance().getAdminProvider().getAdmins();
    }

    public void setAdmins(List<JID> admins) {
        MongoloidDatabase.getInstance().getAdminProvider().setAdmins(admins);
    }

    public boolean isReadOnly() {
        return MongoloidDatabase.getInstance().getAdminProvider().isReadOnly();
    }
}
